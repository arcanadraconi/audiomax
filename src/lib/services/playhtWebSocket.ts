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
  private readonly AUDIO_TIMEOUT = 30000; // 30 seconds timeout

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

  private async getWebSocketUrl(): Promise<string> {
    try {
      console.log('Getting WebSocket auth from server...');
      const response = await fetch('http://localhost:3001/api/websocket-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-ID': this.userId
        }
      });

      if (!response.ok) {
        throw new Error(`WebSocket auth failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('WebSocket URL received');
      return data.websocket_url;
    } catch (error) {
      console.error('Error getting WebSocket URL:', error);
      throw error instanceof Error ? error : new Error('Failed to get WebSocket URL');
    }
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
            }
            
            if (event.data instanceof Blob) {
              // Handle binary audio data
              const reader = new FileReader();
              reader.onload = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const chunk = new Uint8Array(arrayBuffer);
                this.chunks.push(chunk);
                console.log('Received audio chunk for voice:', this.currentVoiceId, 'Size:', chunk.length);
                
                // Update progress
                this.onProgress({
                  progress: Math.min((this.chunks.length / 100) * 100, 99),
                  status: 'receiving'
                });
              };
              reader.readAsArrayBuffer(event.data);
            } else {
              // Handle JSON messages
              const message = JSON.parse(event.data);
              console.log('WebSocket response:', message);

              if ('request_id' in message) {
                console.log('Audio generation completed with voice:', this.currentVoiceId);
                // Set a timeout to ensure we receive all audio chunks
                this.audioTimeout = setTimeout(() => this.finalizeAudio(), 2000);
              }

              if ('error' in message) {
                this.onError(`PlayHT Error: ${message.error}`);
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
          
          if (this.chunks.length > 0) {
            this.finalizeAudio();
          } else {
            this.onError('WebSocket closed before receiving any audio data');
          }
        };

        this.ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          this.isConnecting = false;
          this.connectionPromise = null;

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error finalizing audio';
      console.error('Error finalizing audio:', errorMessage);
      this.onError(`Failed to finalize audio: ${errorMessage}`);
    } finally {
      // Reset state
      this.chunks = [];
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

      // Create the message with exact voice parameter name as per documentation
      const message = {
        text,
        voice: voiceId,
        output_format: 'mp3',
        temperature: 0.7,
        apiKey: this.apiKey,
        userId: this.userId
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
    if (this.audioTimeout) {
      clearTimeout(this.audioTimeout);
      this.audioTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageQueue = [];
    this.chunks = [];
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionPromise = null;
    this.currentVoiceId = null;
    PlayHTWebSocket.instance = null;
  }
}
