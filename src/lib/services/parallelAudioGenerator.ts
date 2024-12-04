import { PlayHTWebSocket, WebSocketProgress } from './playhtWebSocket';
import { ProcessedChunk } from './transcriptProcessor';
import PQueue from 'p-queue';

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
  private retryAttempts: Map<number, number>;
  private maxRetries = 5; // Increased retries
  private retryDelay = 10000; // 10 seconds initial delay
  private maxRetryDelay = 60000; // 1 minute max delay
  private chunkTimeout = 1200000; // 20 minutes per chunk
  private minWordCount = 100; // Minimum words per chunk

  constructor(
    maxConcurrent = 1, // Process one chunk at a time for reliability
    onProgress = (_progress: { overall: number, chunks: GenerationProgress[] }) => {}
  ) {
    this.onProgress = onProgress;
    this.chunkProgress = new Map();
    this.completionCallbacks = new Map();
    this.pendingChunks = new Set();
    this.retryAttempts = new Map();
    this.queue = new PQueue({ 
      concurrency: maxConcurrent,
      timeout: this.chunkTimeout,
      throwOnTimeout: true
    });

    // Handle queue events
    this.queue.on('error', error => {
      console.error('Queue error:', error);
    });

    this.queue.on('idle', () => {
      console.log('Queue is idle');
    });
  }

  /**
   * Generate audio for multiple chunks in parallel
   */
  async generateParallel(chunks: ProcessedChunk[], voice: string): Promise<string[]> {
    try {
      // Validate chunks
      this.validateChunks(chunks);

      // Initialize progress tracking
      chunks.forEach((chunk) => {
        this.chunkProgress.set(chunk.metadata.index, {
          chunkIndex: chunk.metadata.index,
          progress: 0,
          status: 'queued'
        });
        this.pendingChunks.add(chunk.metadata.index);
        this.retryAttempts.set(chunk.metadata.index, 0);
      });

      console.log(`Starting parallel generation for ${chunks.length} chunks`);

      // Initialize WebSocket
      this.webSocket = PlayHTWebSocket.getInstance(
        import.meta.env.VITE_PLAYHT_SECRET_KEY,
        import.meta.env.VITE_PLAYHT_USER_ID,
        (progress: WebSocketProgress) => this.handleWebSocketProgress(progress),
        (audioUrl: string) => this.handleWebSocketComplete(audioUrl),
        (error: string) => this.handleWebSocketError(error)
      );

      // Generate all chunks with retry logic
      const results = await Promise.all(
        chunks.map(chunk => this.generateChunkWithRetry(chunk, voice))
      );

      // Verify all chunks were generated
      this.verifyResults(results, chunks.length);

      // Sort results by chunk index and return audio URLs
      return results
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map(result => result.audioUrl);

    } catch (error) {
      console.error('Error in parallel generation:', error);
      throw error;
    } finally {
      // Clean up WebSocket
      if (this.webSocket) {
        this.webSocket.disconnect();
        this.webSocket = null;
      }
    }
  }

  /**
   * Validate chunks before processing
   */
  private validateChunks(chunks: ProcessedChunk[]) {
    if (chunks.length === 0) {
      throw new Error('No chunks provided for generation');
    }

    // Check for sequential indices
    const indices = chunks.map(chunk => chunk.metadata.index);
    const expectedIndices = Array.from({ length: chunks.length }, (_, i) => i);
    const missingIndices = expectedIndices.filter(i => !indices.includes(i));
    if (missingIndices.length > 0) {
      throw new Error(`Missing chunk indices: ${missingIndices.join(', ')}`);
    }

    // Validate chunk sizes
    chunks.forEach(chunk => {
      if (chunk.metadata.wordCount < this.minWordCount) {
        throw new Error(`Chunk ${chunk.metadata.index} is too small (${chunk.metadata.wordCount} words)`);
      }
    });

    console.log('Chunk validation passed:', {
      totalChunks: chunks.length,
      totalWords: chunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0),
      averageWords: Math.round(chunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0) / chunks.length)
    });
  }

  /**
   * Verify generation results
   */
  private verifyResults(results: GenerationResult[], expectedCount: number) {
    if (results.length !== expectedCount) {
      throw new Error(`Missing results: expected ${expectedCount}, got ${results.length}`);
    }

    // Check for invalid URLs
    const invalidResults = results.filter(result => !result.audioUrl);
    if (invalidResults.length > 0) {
      throw new Error(`Invalid audio URLs for chunks: ${invalidResults.map(r => r.chunkIndex).join(', ')}`);
    }
  }

  /**
   * Generate audio for a single chunk with retry logic
   */
  private async generateChunkWithRetry(chunk: ProcessedChunk, voice: string): Promise<GenerationResult> {
    let lastError: Error | null = null;
    let delay = this.retryDelay;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.generateChunkWithQueue(chunk, voice);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt + 1} failed for chunk ${chunk.metadata.index}:`, error);
        
        if (attempt < this.maxRetries - 1) {
          console.log(`Retrying chunk ${chunk.metadata.index} in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, this.maxRetryDelay); // Exponential backoff
        }
      }
    }

    throw lastError || new Error(`Failed to generate chunk ${chunk.metadata.index} after ${this.maxRetries} attempts`);
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
    console.log(`Chunk size: ${chunk.metadata.wordCount} words`);

    try {
      // Update progress state
      this.updateChunkProgress(chunk.metadata.index, {
        status: 'processing',
        progress: 0
      });

      // Create a promise that will resolve when the generation completes
      const audioUrl = await new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`WebSocket generation timeout for chunk ${chunk.metadata.index}`));
        }, this.chunkTimeout);

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

      // Verify audio URL
      if (!audioUrl) {
        throw new Error(`No audio URL received for chunk ${chunk.metadata.index}`);
      }

      console.log(`Chunk ${chunk.metadata.index} generation successful:`, {
        wordCount: chunk.metadata.wordCount,
        audioUrl
      });

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
    // Find the active chunk and update its status
    const activeChunk = Array.from(this.chunkProgress.entries())
      .find(([_, progress]) => progress.status === 'processing');
    
    if (activeChunk) {
      this.updateChunkProgress(activeChunk[0], {
        status: 'error',
        progress: 0
      });
    }
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
    this.retryAttempts.clear();
  }
}

export type { GenerationProgress, GenerationResult };
