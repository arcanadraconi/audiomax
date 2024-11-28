import { TranscriptProcessor, ProcessedChunk } from './transcriptProcessor';
import { ParallelAudioGenerator, AudioChunk } from './parallelAudioGenerator';
import { AudioAssembler } from './audioAssembler';

export interface ProcessingProgress {
  phase: 'processing' | 'generating' | 'assembling';
  progress: number;
  totalPhases: number;
  currentChunk?: AudioChunk;
}

export interface AudioProcessingOptions {
  voice: string;
  quality?: 'draft' | 'low' | 'medium' | 'high' | 'premium';
  speed?: number;
  maxWordsPerChunk?: number;
  maxConcurrentJobs?: number;
  onProgress?: (progress: ProcessingProgress) => void;
}

export class AudioProcessingService {
  private transcriptProcessor: TranscriptProcessor;
  private audioGenerator: ParallelAudioGenerator;
  private audioAssembler: AudioAssembler;

  constructor(options?: { maxWordsPerChunk?: number; maxConcurrentJobs?: number }) {
    this.transcriptProcessor = new TranscriptProcessor(options?.maxWordsPerChunk);
    this.audioGenerator = new ParallelAudioGenerator(options?.maxConcurrentJobs);
    this.audioAssembler = new AudioAssembler();
  }

  public async processText(
    text: string,
    options: AudioProcessingOptions
  ): Promise<Blob> {
    const { onProgress, ...generationOptions } = options;
    let currentPhase = 0;
    const totalPhases = 3;

    // Phase 1: Process text into chunks
    const chunks = this.transcriptProcessor.processTranscript(text);
    currentPhase++;

    if (onProgress) {
      onProgress({
        phase: 'processing',
        progress: 100,
        totalPhases,
      });
    }

    // Phase 2: Generate audio for each chunk in parallel
    const audioChunks = await this.audioGenerator.generateParallel(
      chunks,
      {
        ...generationOptions,
        onProgress: progress => {
          if (onProgress) {
            onProgress({
              phase: 'generating',
              progress: progress.completedChunks / progress.totalChunks * 100,
              totalPhases,
              currentChunk: progress.currentChunk,
            });
          }
        },
      }
    );
    currentPhase++;

    // Phase 3: Assemble audio chunks
    const finalAudio = await this.audioAssembler.assembleAudio(
      audioChunks,
      progress => {
        if (onProgress) {
          onProgress({
            phase: 'assembling',
            progress: progress.progress,
            totalPhases,
          });
        }
      }
    );

    return finalAudio;
  }

  public async processTextAndSave(
    text: string,
    fileName: string,
    options: AudioProcessingOptions
  ): Promise<void> {
    const { onProgress, ...generationOptions } = options;
    let currentPhase = 0;
    const totalPhases = 3;

    // Phase 1: Process text into chunks
    const chunks = this.transcriptProcessor.processTranscript(text);
    currentPhase++;

    if (onProgress) {
      onProgress({
        phase: 'processing',
        progress: 100,
        totalPhases,
      });
    }

    // Phase 2: Generate audio for each chunk in parallel
    const audioChunks = await this.audioGenerator.generateParallel(
      chunks,
      {
        ...generationOptions,
        onProgress: progress => {
          if (onProgress) {
            onProgress({
              phase: 'generating',
              progress: progress.completedChunks / progress.totalChunks * 100,
              totalPhases,
              currentChunk: progress.currentChunk,
            });
          }
        },
      }
    );
    currentPhase++;

    // Phase 3: Assemble and save audio chunks directly to file
    await this.audioAssembler.assembleAndSaveAudio(
      audioChunks,
      fileName,
      progress => {
        if (onProgress) {
          onProgress({
            phase: 'assembling',
            progress: progress.progress,
            totalPhases,
          });
        }
      }
    );
  }

  public estimateProcessingTime(text: string): number {
    const chunks = this.transcriptProcessor.processTranscript(text);
    return this.transcriptProcessor.estimateProcessingTime(chunks);
  }

  public validateText(text: string): boolean {
    const chunks = this.transcriptProcessor.processTranscript(text);
    return chunks.every(chunk => this.transcriptProcessor.validateChunk(chunk.text));
  }

  public destroy() {
    this.audioGenerator.destroy();
    this.audioAssembler.destroy();
  }
}
