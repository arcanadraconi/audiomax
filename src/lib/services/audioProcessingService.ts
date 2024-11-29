import { playhtClient } from '../playht';

export interface ProcessingProgress {
  phase: 'processing' | 'generating' | 'assembling';
  progress: number;
  totalPhases: number;
}

export interface AudioProcessingOptions {
  voice: string;
  quality?: 'draft' | 'low' | 'medium' | 'high' | 'premium';
  speed?: number;
  onProgress?: (progress: ProcessingProgress) => void;
}

export class AudioProcessingService {
  constructor() {
    console.log('Initializing AudioProcessingService');
  }

  public async processText(text: string, options: AudioProcessingOptions): Promise<Blob> {
    console.log('Starting audio processing');
    console.log('Text preview:', text.substring(0, 100));
    console.log('Options:', options);

    try {
      if (options.onProgress) {
        options.onProgress({
          phase: 'processing',
          progress: 0,
          totalPhases: 3
        });
      }

      // Generate audio using PlayHT
      const result = await playhtClient.generateSpeech(text, {
        voice: options.voice,
        quality: options.quality || 'premium',
        speed: options.speed || 1.0,
      });

      if (options.onProgress) {
        options.onProgress({
          phase: 'generating',
          progress: 50,
          totalPhases: 3
        });
      }

      // Download the audio file
      console.log('Downloading audio from:', result.audioUrl);
      const response = await fetch(result.audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      console.log('Audio downloaded, size:', audioBlob.size);

      if (options.onProgress) {
        options.onProgress({
          phase: 'assembling',
          progress: 100,
          totalPhases: 3
        });
      }

      return audioBlob;
    } catch (error) {
      console.error('Error in audio processing:', error);
      throw error;
    }
  }

  public destroy() {
    // No cleanup needed
  }
}
