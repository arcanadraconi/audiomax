import { splitTextIntoChunks, combineAudioUrls, calculateOverallProgress } from '../audioUtils';

interface GenerationProgress {
  chunkIndex: number;
  totalChunks: number;
  status: 'starting' | 'generating' | 'complete';
  progress: number;
  overallProgress: number;
}

interface GenerationResult {
  audioUrls: string[];
  generationIds: string[];
  combinedAudioBlob?: Blob;
}

export class ParallelAudioGenerator {
  private workers: Worker[] = [];
  private maxWorkers = 3; // Limit concurrent generations
  private results: Map<number, string> = new Map();
  private chunkProgresses: Map<number, number> = new Map();
  private errors: Map<number, string> = new Map();
  private progressCallback: (progress: GenerationProgress) => void;
  private completionCallback: (result: GenerationResult) => void;
  private errorCallback: (error: string) => void;

  constructor(
    onProgress: (progress: GenerationProgress) => void,
    onComplete: (result: GenerationResult) => void,
    onError: (error: string) => void
  ) {
    this.progressCallback = onProgress;
    this.completionCallback = onComplete;
    this.errorCallback = onError;
  }

  async generateAudio(text: string, options: {
    voice: string;
    quality?: string;
    speed?: number;
  }): Promise<void> {
    try {
      // Split text into chunks
      const chunks = splitTextIntoChunks(text);
      const totalChunks = chunks.length;
      console.log(`Splitting text into ${totalChunks} chunks`);

      // Create a pool of workers
      const workerPool = Array.from({ length: Math.min(this.maxWorkers, totalChunks) }, 
        () => new Worker(new URL('../workers/audioGenerationWorker.ts', import.meta.url), { type: 'module' }));

      // Process chunks with available workers
      let currentChunkIndex = 0;

      const processNextChunk = (worker: Worker) => {
        if (currentChunkIndex >= chunks.length) {
          worker.terminate();
          return;
        }

        const chunkIndex = currentChunkIndex++;
        const chunk = chunks[chunkIndex];

        worker.postMessage({
          text: chunk,
          voice: options.voice,
          quality: options.quality || 'premium',
          speed: options.speed || 1,
          chunkIndex,
          totalChunks
        });
      };

      // Handle worker messages
      workerPool.forEach(worker => {
        worker.onmessage = async (e) => {
          const message = e.data;

          switch (message.type) {
            case 'progress':
              this.chunkProgresses.set(message.chunkIndex, message.progress);
              const overallProgress = calculateOverallProgress(this.chunkProgresses, totalChunks);
              
              this.progressCallback({
                chunkIndex: message.chunkIndex,
                totalChunks,
                status: message.status,
                progress: message.progress,
                overallProgress
              });
              break;

            case 'complete':
              this.results.set(message.chunkIndex, message.audioUrl);
              this.chunkProgresses.set(message.chunkIndex, 100);
              
              // Check if all chunks are complete
              if (this.results.size === totalChunks) {
                await this.handleCompletion(totalChunks);
              } else {
                // Process next chunk with this worker
                processNextChunk(worker);
              }
              break;

            case 'error':
              this.errors.set(message.chunkIndex, message.error);
              this.errorCallback(`Error processing chunk ${message.chunkIndex + 1}: ${message.error}`);
              processNextChunk(worker); // Try next chunk despite error
              break;
          }
        };

        // Start initial chunk processing
        processNextChunk(worker);
      });

    } catch (error) {
      this.errorCallback(error instanceof Error ? error.message : 'Unknown error during audio generation');
    }
  }

  private async handleCompletion(totalChunks: number) {
    try {
      // Combine results in correct order
      const audioUrls: string[] = [];
      const generationIds: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const url = this.results.get(i);
        if (url) {
          audioUrls.push(url);
          // Extract generation ID from URL
          const match = url.match(/pigeon\/([^_]+)/);
          if (match) {
            generationIds.push(match[1]);
          }
        }
      }

      // Combine audio files
      console.log('Combining audio files...');
      const combinedAudioBlob = await combineAudioUrls(audioUrls);
      console.log('Audio files combined successfully');

      // Clean up
      this.workers.forEach(worker => worker.terminate());
      this.workers = [];
      this.results.clear();
      this.chunkProgresses.clear();
      this.errors.clear();

      // Return combined results
      this.completionCallback({
        audioUrls,
        generationIds,
        combinedAudioBlob
      });
    } catch (error) {
      this.errorCallback('Error combining audio files: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  cancel() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.results.clear();
    this.chunkProgresses.clear();
    this.errors.clear();
  }
}
