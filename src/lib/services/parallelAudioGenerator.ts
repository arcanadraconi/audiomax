import { PlayHTWebSocket, WebSocketProgress } from './playhtWebSocket';
import { ProcessedChunk } from './transcriptProcessor';
import PQueue from 'p-queue';
import { env } from '../../env';

interface GenerationProgress {
  chunkIndex: number;
  progress: number;
  status: 'queued' | 'processing' | 'complete' | 'error';
}

interface GenerationResult {
  chunkIndex: number;
  audioUrl: string;
}

export class ParallelAudioGenerator {
  private webSockets: PlayHTWebSocket[] = [];
  private queue: PQueue;
  private maxConcurrent: number;
  private onProgress: (progress: { overall: number, chunks: GenerationProgress[] }) => void;
  private chunkProgress: Map<number, GenerationProgress>;
  private results: Map<number, string>;

  constructor(
    maxConcurrent = 3,
    onProgress = (progress: { overall: number, chunks: GenerationProgress[] }) => {}
  ) {
    this.maxConcurrent = maxConcurrent;
    this.onProgress = onProgress;
    this.chunkProgress = new Map();
    this.results = new Map();

    // Initialize queue with concurrency limit
    this.queue = new PQueue({ concurrency: maxConcurrent });

    // Initialize WebSocket pool
    for (let i = 0; i < maxConcurrent; i++) {
      const ws = new PlayHTWebSocket(
        env.playht.secretKey,
        env.playht.userId,
        (progress) => this.handleWebSocketProgress(i, progress),
        (audioUrl) => this.handleWebSocketComplete(i, audioUrl),
        (error) => this.handleWebSocketError(i, error)
      );
      this.webSockets.push(ws);
    }
  }

  /**
   * Generate audio for multiple chunks in parallel
   */
  async generateParallel(chunks: ProcessedChunk[], voice: string): Promise<string[]> {
    try {
      // Initialize progress tracking
      chunks.forEach((chunk) => {
        this.chunkProgress.set(chunk.metadata.index, {
          chunkIndex: chunk.metadata.index,
          progress: 0,
          status: 'queued'
        });
      });

      console.log(`Starting parallel generation for ${chunks.length} chunks`);

      // Add generation tasks to queue
      const tasks = chunks.map((chunk) => 
        this.queue.add(async (): Promise<GenerationResult> => this.generateChunk(chunk, voice))
      );

      // Wait for all tasks to complete and assert the type
      const results = await Promise.all(tasks);
      console.log('All chunks generated successfully');

      // Sort results by chunk index
      return results
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(result => result.audioUrl);

    } catch (error) {
      console.error('Error in parallel generation:', error);
      throw error;
    }
  }

  /**
   * Generate audio for a single chunk using WebSocket
   */
  private async generateChunk(chunk: ProcessedChunk, voice: string): Promise<GenerationResult> {
    const wsIndex = chunk.metadata.index % this.maxConcurrent;
    console.log(`Using WebSocket ${wsIndex} for chunk ${chunk.metadata.index}`);

    try {
      // Update progress state
      this.updateChunkProgress(chunk.metadata.index, {
        status: 'processing',
        progress: 0
      });

      // Create a promise that will resolve when the WebSocket completes
      const resultPromise = new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('WebSocket generation timeout'));
        }, 300000); // 5 minute timeout

        // Create a new WebSocket for this chunk
        const ws = new PlayHTWebSocket(
          env.playht.secretKey,
          env.playht.userId,
          (progress) => {
            this.handleWebSocketProgress(wsIndex, progress);
            console.log(`Chunk ${chunk.metadata.index} progress:`, progress);
          },
          (audioUrl) => {
            clearTimeout(timeoutId);
            console.log(`Chunk ${chunk.metadata.index} complete:`, audioUrl);
            resolve(audioUrl);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error(`Chunk ${chunk.metadata.index} error:`, error);
            reject(new Error(error));
          }
        );

        // Replace the WebSocket in the pool
        this.webSockets[wsIndex] = ws;

        // Generate speech
        console.log(`Starting generation for chunk ${chunk.metadata.index}`);
        ws.generateSpeech(chunk.text, voice).catch(reject);
      });

      // Wait for result
      const audioUrl = await resultPromise;
      console.log(`Chunk ${chunk.metadata.index} generation successful`);

      // Update progress state
      this.updateChunkProgress(chunk.metadata.index, {
        status: 'complete',
        progress: 100
      });

      return {
        chunkIndex: chunk.metadata.index,
        audioUrl
      };

    } catch (error) {
      // Update progress state
      this.updateChunkProgress(chunk.metadata.index, {
        status: 'error',
        progress: 0
      });

      console.error(`Error generating chunk ${chunk.metadata.index}:`, error);
      throw error;
    }
  }

  /**
   * Handle WebSocket progress updates
   */
  private handleWebSocketProgress(wsIndex: number, progress: WebSocketProgress) {
    // Find the chunk currently being processed by this WebSocket
    const chunk = Array.from(this.chunkProgress.entries())
      .find(([_, progress]) => progress.status === 'processing');
    
    if (chunk) {
      this.updateChunkProgress(chunk[0], {
        progress: progress.progress
      });
    }
  }

  /**
   * Handle WebSocket completion
   */
  private handleWebSocketComplete(wsIndex: number, audioUrl: string) {
    console.log(`WebSocket ${wsIndex} completed with URL:`, audioUrl);
  }

  /**
   * Handle WebSocket errors
   */
  private handleWebSocketError(wsIndex: number, error: string) {
    console.error(`WebSocket ${wsIndex} error:`, error);
  }

  /**
   * Update progress for a chunk and emit overall progress
   */
  private updateChunkProgress(chunkIndex: number, update: Partial<GenerationProgress>) {
    const currentProgress = this.chunkProgress.get(chunkIndex);
    if (!currentProgress) return;

    const updatedProgress = {
      ...currentProgress,
      ...update
    };

    this.chunkProgress.set(chunkIndex, updatedProgress);

    // Calculate overall progress
    const chunks = Array.from(this.chunkProgress.values());
    const totalProgress = chunks.reduce((sum, chunk) => sum + chunk.progress, 0);
    const overallProgress = totalProgress / chunks.length;

    // Emit progress update
    this.onProgress({
      overall: overallProgress,
      chunks: chunks
    });
  }

  /**
   * Clean up WebSocket connections
   */
  dispose() {
    this.webSockets.forEach(ws => ws.disconnect());
    this.webSockets = [];
    this.queue.clear();
    this.chunkProgress.clear();
    this.results.clear();
  }
}

export type { GenerationProgress, GenerationResult };
