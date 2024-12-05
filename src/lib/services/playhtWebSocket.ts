export interface WebSocketProgress {
  progress: number;
  status?: string;
}

export class PlayHTWebSocket {
  private static instance: PlayHTWebSocket | null = null;
  private ws: WebSocket | null = null;
  private messageQueue: any[] = [];
  private onProgress: (progress: WebSocketProgress) => void;
  private onComplete: (audioUrl: string) => void;
  private onError: (error: string) => void;
  private chunks: Uint8Array[] = [];
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 2000; // 2 seconds
  private connectionPromise: Promise<void> | null = null;
  private currentVoiceId: string | null = null;
  private audioTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private closeTimeout: NodeJS.Timeout | null = null;
  private readonly AUDIO_TIMEOUT = 300000; // 5 minutes timeout for longer content
  private readonly HEARTBEAT_INTERVAL = 15000; // 15 seconds
  private readonly CLOSE_DELAY = 180000; // 3 minutes wait before closing for longer content
  private isGenerating: boolean = false;
  private lastChunkTime: number = 0;
  private minExpectedChunks: number = 3;

  private constructor(
    private readonly apiKey: string,
    private readonly userId: string,
    onProgress: (progress: WebSocketProgress) => void,
    onComplete: (audioUrl: string) => void,
    onError: (error: string) => void
  ) {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  public static getInstance(
    apiKey: string,
    userId: string,
    onProgress: (progress: WebSocketProgress) => void,
    onComplete: (audioUrl: string) => void,
    onError: (error: string) => void
  ): PlayHTWebSocket {
    if (!PlayHTWebSocket.instance) {
      PlayHTWebSocket.instance = new PlayHTWebSocket(apiKey, userId, onProgress, onComplete, onError);
    }
    return PlayHTWebSocket.instance;
  }

  private getBaseUrl(): string {
    return window.location.origin + '/api';
  }

  private async getWebSocketUrl(): Promise<string> {
    try {
      console.log('Getting WebSocket auth from server...');
      const response = await fetch(`${this.getBaseUrl()}/websocket-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-ID': this.userId
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WebSocket auth failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('WebSocket auth response:', data);

      if (!data.websocket_url) {
        throw new Error('No WebSocket URL in server response');
      }

      return data.websocket_url;
    } catch (error) {
      console.error('Error getting WebSocket URL:', error);
      throw error instanceof Error ? error : new Error('Failed to get WebSocket URL');
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('Sending heartbeat ping...');
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private resetCloseTimeout() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
    this.closeTimeout = setTimeout(() => {
      console.log('Close timeout reached, finalizing audio...');
      this.finalizeAudio();
    }, this.CLOSE_DELAY);
  }

  private async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      if (this.connectionPromise) {
        return this.connectionPromise;
      }
    }

    this.isConnecting = true;
    console.log('Connecting to WebSocket...');

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        const url = await this.getWebSocketUrl();
        if (!url) {
          throw new Error('No WebSocket URL received');
        }

        console.log('Attempting WebSocket connection to:', url);
        this.ws = new WebSocket(url);

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second connection timeout

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionPromise = null;

          // Start heartbeat
          this.startHeartbeat();

          // Send any queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            console.log('Sending queued message:', message);
            this.ws?.send(JSON.stringify(message));
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            // Reset audio timeout on any message
            if (this.audioTimeout) {
              clearTimeout(this.audioTimeout);
              this.audioTimeout = setTimeout(() => {
                this.onError('Audio generation timed out. Please try again.');
                this.disconnect();
              }, this.AUDIO_TIMEOUT);
            }
            
            if (event.data instanceof Blob) {
              // Handle binary audio data
              const reader = new FileReader();
              reader.onload = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const chunk = new Uint8Array(arrayBuffer);
                this.chunks.push(chunk);
                this.lastChunkTime = Date.now();
                console.log('Received audio chunk for voice:', this.currentVoiceId, 'Size:', chunk.length);
                
                // Update progress
                this.onProgress({
                  progress: Math.min((this.chunks.length / 100) * 100, 99),
                  status: 'receiving'
                });

                // Reset close timeout
                this.resetCloseTimeout();
              };
              reader.readAsArrayBuffer(event.data);
            } else {
              // Handle JSON messages
              const message = JSON.parse(event.data);
              console.log('WebSocket response:', message);

              if (message.type === 'pong') {
                console.log('Received heartbeat pong');
                return;
              }

              if ('request_id' in message) {
                console.log('Audio generation started for voice:', this.currentVoiceId);
                this.isGenerating = true;
                this.lastChunkTime = Date.now();
                this.resetCloseTimeout();
              }

              if ('error' in message) {
                this.onError(`PlayHT Error: ${message.error}`);
                this.isGenerating = false;
              }

              // Check for completion message
              if (message.type === 'complete' || message.status === 'complete') {
                console.log('Received completion message, finalizing audio...');
                this.finalizeAudio();
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error processing WebSocket message';
            console.error('Error processing WebSocket message:', errorMessage);
            this.onError(`Failed to process WebSocket message: ${errorMessage}`);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.connectionPromise = null;
          this.stopHeartbeat();
          
          // Check if we should finalize audio
          if (this.chunks.length >= this.minExpectedChunks) {
            console.log(`WebSocket closed with ${this.chunks.length} chunks received, finalizing audio...`);
            this.finalizeAudio();
          } else if (this.isGenerating) {
            // Only attempt reconnect if we were in the middle of generation
            if (event.code !== 1000) {
              if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
                setTimeout(() => this.connect(), this.reconnectDelay);
              } else {
                this.onError('WebSocket closed before receiving all audio data');
              }
            }
          }
          this.isGenerating = false;
        };

        this.ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          this.isConnecting = false;
          this.connectionPromise = null;
          this.stopHeartbeat();
          this.isGenerating = false;

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
          } else {
            this.onError('WebSocket connection failed after multiple attempts');
            reject(new Error('WebSocket connection failed'));
          }
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error connecting to WebSocket';
        console.error('Error connecting to WebSocket:', errorMessage);
        this.isConnecting = false;
        this.connectionPromise = null;
        this.isGenerating = false;
        reject(new Error(errorMessage));
      }
    });

    return this.connectionPromise;
  }

  private finalizeAudio() {
    if (this.audioTimeout) {
      clearTimeout(this.audioTimeout);
      this.audioTimeout = null;
    }

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    if (this.chunks.length === 0) {
      this.onError('No audio data received. Please check your internet connection and try again.');
      return;
    }

    try {
      // Combine chunks
      const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedArray = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of this.chunks) {
        combinedArray.set(chunk, offset);
        offset += chunk.length;
      }

      // Validate combined array
      if (totalLength === 0 || offset === 0) {
        throw new Error('Invalid audio data');
      }

      // Create final audio blob
      const blob = new Blob([combinedArray], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      console.log('Audio generation complete:', {
        voice: this.currentVoiceId,
        chunks: this.chunks.length,
        totalSize: totalLength
      });

      this.onProgress({ progress: 100, status: 'complete' });
      this.onComplete(url);
      this.isGenerating = false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error finalizing audio';
      console.error('Error finalizing audio:', errorMessage);
      this.onError(`Failed to finalize audio: ${errorMessage}`);
    } finally {
      // Reset state
      this.chunks = [];
      this.lastChunkTime = 0;
    }
  }

  async generateSpeech(text: string, voiceId: string): Promise<void> {
    try {
      if (!text || !voiceId) {
        throw new Error('Text and voice ID are required');
      }

      await this.connect();

      // Store and log the exact voice ID being used
      this.currentVoiceId = voiceId;
      console.log('🎙️ Raw voice ID received:', voiceId);

      // Set timeout for audio reception
      if (this.audioTimeout) {
        clearTimeout(this.audioTimeout);
      }
      this.audioTimeout = setTimeout(() => {
        this.onError('Audio generation timed out. Please try again.');
        this.disconnect();
      }, this.AUDIO_TIMEOUT);

      // Create the message according to Play3.0-mini requirements
      const message = {
        text,
        voice: voiceId,
        output_format: 'mp3',
        voice_engine: 'Play3.0-mini',
        quality: 'premium',
        speed: 0.9 // Slightly slower speed for better quality
      };

      // Log the full request for debugging
      console.log('📝 Full WebSocket request:', JSON.stringify(message, null, 2));

      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('Sending generation request...');
        this.ws.send(JSON.stringify(message));
      } else {
        console.log('Queueing message for later');
        this.messageQueue.push(message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error generating speech';
      console.error('Error in generateSpeech:', errorMessage);
      this.onError(`Failed to generate speech: ${errorMessage}`);
    }
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.audioTimeout) {
      clearTimeout(this.audioTimeout);
      this.audioTimeout = null;
    }

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    
    // Finalize audio if we have enough chunks before disconnecting
    if (this.chunks.length >= this.minExpectedChunks) {
      console.log(`Finalizing audio before disconnect with ${this.chunks.length} chunks...`);
      this.finalizeAudio();
    }
    
    if (this.ws && !this.isGenerating) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.messageQueue = [];
    this.chunks = [];
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionPromise = null;
    this.currentVoiceId = null;
    this.lastChunkTime = 0;
    PlayHTWebSocket.instance = null;
  }
}
