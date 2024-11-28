import * as Comlink from 'comlink';
import PQueue from 'p-queue';
import { ProcessedChunk } from './transcriptProcessor';
import { playhtClient } from '../playht';

export interface AudioChunk {
  index: number;
  url: string;
  duration: number;
}

interface GenerationProgress {
  completedChunks: number;
  totalChunks: number;
  currentChunk?: AudioChunk;
}

interface GenerationOptions {
  voice: string;
  quality?: 'draft' | 'low' | 'medium' | 'high' | 'premium';
  speed?: number;
  onProgress?: (progress: GenerationProgress) => void;
}

export class ParallelAudioGenerator {
  private queue: PQueue;
  private workers: Worker[];
  private maxConcurrent: number;

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.queue = new PQueue({ concurrency: maxConcurrent });
    this.workers = [];
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxConcurrent; i++) {
      const worker = new Worker(
        new URL('../workers/audioGenerationWorker.ts', import.meta.url),
        { type: 'module' }
      );
      this.workers.push(worker);
    }
  }

  private async generateChunk(
    chunk: ProcessedChunk,
    options: GenerationOptions,
    workerIndex: number
  ): Promise<AudioChunk> {
    const worker = this.workers[workerIndex];
    const generateAudio = Comlink.wrap<typeof playhtClient.generateSpeech>(worker);

    try {
      const result = await generateAudio(chunk.text, {
        voice: options.voice,
        quality: options.quality || 'premium',
        speed: options.speed,
      });

      return {
        index: chunk.index,
        url: result.output.audio_url,
        duration: 0, // Duration will be set when audio is loaded
      };
    } catch (error) {
      console.error(`Error generating audio for chunk ${chunk.index}:`, error);
      throw error;
    }
  }

  public async generateParallel(
    chunks: ProcessedChunk[],
    options: GenerationOptions
  ): Promise<AudioChunk[]> {
    const results: AudioChunk[] = new Array(chunks.length);
    let completedChunks = 0;

    const tasks = chunks.map((chunk, index) => {
      return async () => {
        const workerIndex = index % this.maxConcurrent;
        const result = await this.generateChunk(chunk, options, workerIndex);
        results[chunk.index] = result;
        completedChunks++;

        if (options.onProgress) {
          options.onProgress({
            completedChunks,
            totalChunks: chunks.length,
            currentChunk: result,
          });
        }

        return result;
      };
    });

    await Promise.all(tasks.map(task => this.queue.add(task)));

    // Clean up workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.initializeWorkers();

    return results;
  }

  public async generateStreaming(
    chunks: ProcessedChunk[],
    options: GenerationOptions
  ): Promise<ReadableStream<AudioChunk>> {
    const self = this;
    const transformer = new TransformStream<ProcessedChunk, AudioChunk>({
      async transform(chunk, controller) {
        try {
          const workerIndex = chunk.index % self.maxConcurrent;
          const result = await self.generateChunk(chunk, options, workerIndex);
          controller.enqueue(result);
        } catch (error) {
          controller.error(error);
        }
      }
    });

    const processChunks = async () => {
      const writer = transformer.writable.getWriter();
      let completedChunks = 0;

      try {
        const tasks = chunks.map(chunk => async () => {
          await writer.write(chunk);
          completedChunks++;

          if (options.onProgress) {
            const currentChunk = await this.generateChunk(chunk, options, chunk.index % this.maxConcurrent);
            options.onProgress({
              completedChunks,
              totalChunks: chunks.length,
              currentChunk,
            });
          }
        });

        await Promise.all(tasks.map(task => this.queue.add(task)));
      } finally {
        await writer.close();
      }
    };

    // Start processing in the background
    processChunks().catch(error => {
      console.error('Error in stream processing:', error);
      transformer.writable.abort(error);
    });

    return transformer.readable;
  }

  public destroy() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.queue.clear();
  }
}
