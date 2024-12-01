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
  private webSocket: PlayHTWebSocket | null = null;
  private queue: PQueue;
  private onProgress: (progress: { overall: number, chunks: GenerationProgress[] }) => void;
  private chunkProgress: Map<number, GenerationProgress>;
  private completionCallbacks: Map<number, (url: string) => void>;
  private pendingChunks: Set<number>;

  constructor(
    maxConcurrent = 3,
    onProgress = (progress: { overall: number, chunks: GenerationProgress[] }) => {}
  ) {
    this.onProgress = onProgress;
    this.chunkProgress = new Map();
    this.completionCallbacks = new Map();
    this.pendingChunks = new Set();
    this.queue = new PQueue({ concurrency: maxConcurrent });
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
        this.pendingChunks.add(chunk.metadata.index);
      });

      console.log(`Starting parallel generation for ${chunks.length} chunks`);

      // Initialize WebSocket with voice
      this.webSocket = new PlayHTWebSocket(
        env.playht.secretKey,
        env.playht.userId,
        (progress) => this.handleWebSocketProgress(progress),
        (audioUrl) => this.handleWebSocketComplete(audioUrl),
        (error) => this.handleWebSocketError(error)
      );

      // Generate all chunks
      const results = await Promise.all(
        chunks.map(chunk => this.generateChunkWithQueue(chunk, voice))
      );

      // Wait for all chunks to complete
      console.log('Waiting for all chunks to complete...');
      while (this.pendingChunks.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Clean up WebSocket
      if (this.webSocket) {
        this.webSocket.disconnect();
        this.webSocket = null;
      }

      // Sort results by chunk index and return audio URLs
      return results
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(result => result.audioUrl);

    } catch (error) {
      console.error('Error in parallel generation:', error);
      // Clean up WebSocket on error
      if (this.webSocket) {
        this.webSocket.disconnect();
        this.webSocket = null;
      }
      throw error;
    }
  }

  /**
   * Generate audio for a single chunk using queue
   */
  private async generateChunkWithQueue(chunk: ProcessedChunk, voice: string): Promise<GenerationResult> {
    return new Promise<GenerationResult>((resolve, reject) => {
      this.queue.add(async () => {
        try {
          const result = await this.generateChunk(chunk, voice);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Generate audio for a single chunk using WebSocket
   */
  private async generateChunk(chunk: ProcessedChunk, voice: string): Promise<GenerationResult> {
    console.log(`Generating chunk ${chunk.metadata.index} with voice ${voice}`);

    try {
      // Update progress state
      this.updateChunkProgress(chunk.metadata.index, {
        status: 'processing',
        progress: 0
      });

      // Create a promise that will resolve when the generation completes
      const audioUrl = await new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('WebSocket generation timeout'));
        }, 300000); // 5 minute timeout

        // Store completion callback
        this.completionCallbacks.set(chunk.metadata.index, (url: string) => {
          clearTimeout(timeoutId);
          this.pendingChunks.delete(chunk.metadata.index);
          resolve(url);
        });

        // Generate speech
        if (!this.webSocket) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        this.webSocket.generateSpeech(chunk.text, voice).catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
      });

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
    } finally {
      // Clean up completion callback
      this.completionCallbacks.delete(chunk.metadata.index);
    }
  }

  /**
   * Handle WebSocket progress updates
   */
  private handleWebSocketProgress(progress: WebSocketProgress) {
    // Find the chunk currently being processed
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
  private handleWebSocketComplete(audioUrl: string) {
    console.log('WebSocket completed with URL:', audioUrl);
    // Find the active chunk and resolve its promise
    const activeChunk = Array.from(this.chunkProgress.entries())
      .find(([_, progress]) => progress.status === 'processing');
    
    if (activeChunk) {
      const callback = this.completionCallbacks.get(activeChunk[0]);
      if (callback) {
        callback(audioUrl);
      }
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleWebSocketError(error: string) {
    console.error('WebSocket error:', error);
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
    if (this.webSocket) {
      this.webSocket.disconnect();
      this.webSocket = null;
    }
    this.queue.clear();
    this.chunkProgress.clear();
    this.completionCallbacks.clear();
    this.pendingChunks.clear();
  }
}

export type { GenerationProgress, GenerationResult };
