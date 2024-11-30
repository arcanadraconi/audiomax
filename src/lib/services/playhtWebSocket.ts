interface WebSocketAuthResponse {
  websocket_url: string;
}

interface WebSocketMessage {
  text: string;
  voice_id: string;
  model: 'Play3.0-mini';
  quality: 'premium';
  output_format: 'mp3';
  speed: number;
}

interface WebSocketProgress {
  progress: number;
  status: string;
}

export class PlayHTWebSocket {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private userId: string;
  private onProgress: (progress: WebSocketProgress) => void;
  private onComplete: (audioUrl: string) => void;
  private onError: (error: string) => void;
  private audioChunks: Uint8Array[] = [];
  private baseUrl = 'http://localhost:3001/api';
  private pendingMessage: WebSocketMessage | null = null;
  private jobId: string | null = null;

  constructor(
    apiKey: string,
    userId: string,
    onProgress: (progress: WebSocketProgress) => void,
    onComplete: (audioUrl: string) => void,
    onError: (error: string) => void
  ) {
    this.apiKey = apiKey;
    this.userId = userId;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  private async getWebSocketUrl(): Promise<string> {
    try {
      console.log('Getting WebSocket auth from server...');
      const response = await fetch(`${this.baseUrl}/websocket-auth`, {
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

      const data: WebSocketAuthResponse = await response.json();
      console.log('WebSocket URL received:', data.websocket_url);
      return data.websocket_url;
    } catch (error) {
      console.error('Failed to get WebSocket URL:', error);
      throw new Error(`Failed to get WebSocket URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async connect(): Promise<void> {
    try {
      console.log('Connecting to WebSocket...');
      const wsUrl = await this.getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          // Send pending message if exists
          if (this.pendingMessage && this.ws?.readyState === WebSocket.OPEN) {
            console.log('Sending pending message:', this.pendingMessage);
            this.ws.send(JSON.stringify(this.pendingMessage));
            this.pendingMessage = null;
          }
          resolve();
        };

        this.ws.onmessage = async (event) => {
          try {
            if (event.data instanceof Blob) {
              // Handle binary audio data
              const buffer = await event.data.arrayBuffer();
              this.audioChunks.push(new Uint8Array(buffer));
              console.log('Received audio chunk, size:', buffer.byteLength);
              return;
            }

            // Handle JSON messages
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);

            if (data.job_id && !this.jobId) {
              this.jobId = data.job_id;
              console.log('Job ID received:', this.jobId);
            }

            if (data.error) {
              this.onError(data.error.message || 'Unknown error');
              return;
            }

            if (data.progress !== undefined) {
              this.onProgress({
                progress: data.progress,
                status: data.status || 'processing'
              });
              return;
            }

            if (data.audio) {
              // Convert base64 audio to blob URL
              const audioData = atob(data.audio);
              const arrayBuffer = new ArrayBuffer(audioData.length);
              const uint8Array = new Uint8Array(arrayBuffer);
              for (let i = 0; i < audioData.length; i++) {
                uint8Array[i] = audioData.charCodeAt(i);
              }
              const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
              const url = URL.createObjectURL(blob);
              this.onComplete(url);
              return;
            }

          } catch (e) {
            console.error('Error handling WebSocket message:', e);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          if (this.audioChunks.length > 0) {
            // Combine all audio chunks into a single blob
            const blob = new Blob(this.audioChunks, { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            console.log('Audio processing complete, URL created');
            this.onComplete(url);
            this.audioChunks = [];
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection error'));
        };
      });
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      throw new Error(`WebSocket connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateSpeech(text: string, voice: string): Promise<void> {
    const message: WebSocketMessage = {
      text,
      voice_id: voice,
      model: 'Play3.0-mini',
      quality: 'premium',
      output_format: 'mp3',
      speed: 1.0
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, connecting...');
      this.pendingMessage = message;
      await this.connect();
    } else {
      console.log('Sending generation request:', message);
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    console.log('Disconnecting WebSocket');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export type { WebSocketProgress, WebSocketMessage };
