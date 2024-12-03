import { expose } from 'comlink';
import { PlayHTWebSocket, WebSocketProgress } from '../services/playhtWebSocket';
import { env } from '../../env';

// Define worker scope type
declare const self: Worker;

class AudioGenerationWorker {
  private ws: PlayHTWebSocket | null = null;

  async generateAudio(text: string, voice: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket if not exists
        if (!this.ws) {
          this.ws = PlayHTWebSocket.getInstance(
            env.playht.secretKey,
            env.playht.userId,
            (progress: WebSocketProgress) => {
              // Post progress updates to main thread
              self.postMessage({
                type: 'progress',
                data: progress
              });
            },
            (audioUrl: string) => {
              // Resolve promise with audio URL
              resolve(audioUrl);
            },
            (error: string) => {
              // Reject promise with error
              reject(new Error(error));
            }
          );
        }

        // Generate speech using WebSocket
        if (!this.ws) {
          throw new Error('Failed to initialize WebSocket');
        }
        
        this.ws.generateSpeech(text, voice).catch((error: Error) => {
          reject(error);
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Unknown error in audio generation'));
      }
    });
  }

  dispose(): void {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
  }
}

// Create and expose worker
const worker = new AudioGenerationWorker();
expose(worker);

// Handle cleanup
self.addEventListener('unload', () => {
  worker.dispose();
});

// Handle errors
self.addEventListener('error', (event: ErrorEvent) => {
  console.error('Worker error:', event.error);
});

// Export worker type for TypeScript
export type { AudioGenerationWorker };
