import { TranscriptProcessor } from './services/transcriptProcessor';
import { ParallelAudioGenerator } from './services/parallelAudioGenerator';
import { AudioAssembler } from './services/audioAssembler';
import { env } from '../env';

type VoiceEngine = 'PlayHT2.0' | 'PlayHT2.0-turbo' | 'PlayHT1.0' | 'Standard' | 'Play3.0-mini';

interface Voice {
  id: string;
  name: string;
  sample: string;
  accent: string;
  age: string;
  gender: string;
  language: string;
  language_code: string;
  loudness: string;
  style: string;
  tempo: string;
  texture: string;
  is_cloned: boolean;
  voiceEngine: VoiceEngine;
}

interface SpeechGenerationOptions {
  voice: string;
  quality?: 'draft' | 'standard' | 'premium';
  output_format?: 'mp3' | 'wav';
  speed?: number;
  temperature?: number;
  request_id?: string;
}

interface SpeechGenerationResponse {
  status: string;
  audioUrl: string;
  audioUrls?: string[];
  generationId?: string;
  generationIds?: string[];
  chunks?: number;
}

class PlayHTClient {
  private baseUrl: string;
  private generator: ParallelAudioGenerator | null = null;
  private assembler: AudioAssembler | null = null;

  constructor() {
    this.baseUrl = 'http://localhost:3001/api';
    console.log('PlayHT client initialized with baseUrl:', this.baseUrl);
  }

  async getVoices(): Promise<Voice[]> {
    try {
      console.log('Fetching voices from server');
      const response = await fetch(`${this.baseUrl}/voices`);
      const data = await response.json();

      console.log('Raw voices response:', data);
      const voices = data?.voices || [];
      
      // Sort voices by name for better organization
      return voices.sort((a: Voice, b: Voice) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, options: SpeechGenerationOptions): Promise<SpeechGenerationResponse> {
    try {
      // Notify that generation is starting
      window.dispatchEvent(new CustomEvent('audioGenerationStart'));

      console.log('Starting speech generation with parallel processing');
      console.log('Text length:', text.length, 'characters');

      // Process text into optimal chunks
      const chunks = TranscriptProcessor.processText(text);
      console.log(`Split text into ${chunks.length} chunks`);

      // Initialize parallel generator if needed
      if (!this.generator) {
        this.generator = new ParallelAudioGenerator(
          3, // Max concurrent generations
          (progress) => {
            // Emit progress event
            window.dispatchEvent(new CustomEvent('audioGenerationProgress', {
              detail: { 
                progress: progress.overall,
                currentChunk: progress.chunks.length,
                totalChunks: chunks.length
              }
            }));
          }
        );
      }

      // Initialize audio assembler if needed
      if (!this.assembler) {
        this.assembler = new AudioAssembler((progress) => {
          // Emit assembly progress event
          window.dispatchEvent(new CustomEvent('audioAssemblyProgress', {
            detail: { 
              phase: progress.phase,
              progress: progress.progress
            }
          }));
        });
      }

      // Generate audio for all chunks in parallel
      console.log('Starting parallel audio generation');
      const audioUrls = await this.generator.generateParallel(chunks, options.voice);
      console.log(`Generated ${audioUrls.length} audio chunks`);

      // Combine audio chunks if needed
      let finalAudioUrl: string;
      if (audioUrls.length > 1) {
        console.log('Combining audio chunks');
        const combinedBlob = await this.assembler.combineAudioUrls(audioUrls);
        finalAudioUrl = URL.createObjectURL(combinedBlob);
        console.log('Audio chunks combined successfully');
      } else {
        finalAudioUrl = audioUrls[0];
      }

      // Process final audio if needed
      if (options.speed && options.speed !== 1) {
        console.log('Processing final audio');
        const processedBlob = await this.assembler.processAudio(finalAudioUrl, {
          speed: options.speed
        });
        URL.revokeObjectURL(finalAudioUrl);
        finalAudioUrl = URL.createObjectURL(processedBlob);
        console.log('Audio processing complete');
      }

      // Emit completion event
      window.dispatchEvent(new CustomEvent('audioGenerated', {
        detail: {
          url: finalAudioUrl,
          title: 'Generated Audio'
        }
      }));

      return {
        status: 'success',
        audioUrl: finalAudioUrl,
        audioUrls: audioUrls,
        chunks: chunks.length
      };

    } catch (error: any) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  async cloneVoice(name: string, files: File[]): Promise<any> {
    try {
      console.log('Cloning voice:', name);
      const formData = new FormData();
      formData.append('name', name);
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`${this.baseUrl}/clone`, {
        method: 'POST',
        body: formData
      });

      return response.json();
    } catch (error) {
      console.error('Error cloning voice:', error);
      throw error;
    }
  }

  async getClonedVoices(): Promise<Voice[]> {
    try {
      console.log('Fetching cloned voices');
      const response = await fetch(`${this.baseUrl}/cloned-voices`);
      const data = await response.json();

      const voices = data?.voices || [];
      console.log(`Fetched ${voices.length} cloned voices`);
      return voices;
    } catch (error) {
      console.error('Error fetching cloned voices:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.generator) {
      this.generator.dispose();
      this.generator = null;
    }
    if (this.assembler) {
      this.assembler.dispose();
      this.assembler = null;
    }
  }
}

export const playhtClient = new PlayHTClient();
export type { Voice, SpeechGenerationOptions, SpeechGenerationResponse };
export default playhtClient;
