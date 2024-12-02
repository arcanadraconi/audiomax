interface WebSocketProgress {
  progress: number;
  status?: string;
}

export class PlayHTWebSocket {
  private ws: WebSocket | null = null;
  private messageQueue: any[] = [];
  private onProgress: (progress: WebSocketProgress) => void;
  private onComplete: (audioUrl: string) => void;
  private onError: (error: string) => void;
  private apiKey: string;
  private userId: string;
  private chunks: Uint8Array[] = [];
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 2000; // 2 seconds

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
      const response = await fetch('http://localhost:3001/api/websocket-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`WebSocket auth failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('WebSocket URL received:', data.url);
      return data.url;
    } catch (error) {
      console.error('Error getting WebSocket URL:', error);
      throw error;
    }
  }

  private async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    console.log('Connecting to WebSocket...');

    try {
      const url = await this.getWebSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Send any queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          console.log('Sending pending message:', message);
          this.ws?.send(JSON.stringify(message));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          if (event.data instanceof Blob) {
            // Handle binary audio data
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              const chunk = new Uint8Array(arrayBuffer);
              this.chunks.push(chunk);
              console.log('Received audio chunk, size:', chunk.length);
            };
            reader.readAsArrayBuffer(event.data);
          } else {
            // Handle JSON messages
            const message = JSON.parse(event.data);
            console.log('WebSocket message:', message);

            if (message.job_id) {
              console.log('Job ID received:', message.job_id);
            }

            if (message.progress !== undefined) {
              this.onProgress({
                progress: message.progress,
                status: message.status
              });
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.isConnecting = false;

        // Create audio blob and URL
        if (this.chunks.length > 0) {
          const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combinedArray = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of this.chunks) {
            combinedArray.set(chunk, offset);
            offset += chunk.length;
          }
          const blob = new Blob([combinedArray], { type: 'audio/mp3' });
          const url = URL.createObjectURL(blob);
          console.log('Audio processing complete, URL created');
          this.onComplete(url);
        }

        // Reset chunks array
        this.chunks = [];
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
          this.onError('WebSocket connection failed after multiple attempts');
        }
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;
      this.onError('Failed to connect to WebSocket');
    }
  }

  async generateSpeech(text: string, voiceId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, connecting...');
      await this.connect();
    }

    const message = {
      text,
      voice_id: voiceId,
      model: 'Play3.0-mini',
      quality: 'premium',
      output_format: 'mp3',
      speed: 1.0,
      sample_rate: 24000
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Sending generation request:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.log('Queueing message for later');
      this.messageQueue.push(message);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageQueue = [];
    this.chunks = [];
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }
}

export type { WebSocketProgress };
