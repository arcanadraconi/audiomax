import { TranscriptProcessor } from './services/transcriptProcessor';
import { ParallelAudioGenerator } from './services/parallelAudioGenerator';
import { AudioAssembler } from './services/audioAssembler';

// Update voice engine types to match PlayHT's latest offerings
type VoiceEngine = 'PlayHT2.0' | 'PlayHT2.0-turbo' | 'Play3.0-mini' | 'Standard';

interface RawVoice {
  id: string;
  name: string;
  preview_url?: string;
  sample_url?: string;
  accent?: string;
  age?: string;
  gender?: string;
  language?: string;
  language_code?: string;
  loudness?: string;
  style?: string;
  tempo?: string;
  texture?: string;
  is_cloned?: boolean;
  voice_engine?: VoiceEngine;
  user_id?: string;
}

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
  user_id?: string; // Optional field for cloned voices
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

interface VoiceCache {
  voices: Voice[];
  timestamp: number;
}

class PlayHTClient {
  private baseUrl: string;
  private generator: ParallelAudioGenerator | null = null;
  private assembler: AudioAssembler | null = null;
  private voiceCache: VoiceCache | undefined;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Use the appropriate URL based on environment
    this.baseUrl = window.location.origin + '/api';
    console.log('PlayHT client initialized with baseUrl:', this.baseUrl);
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(import.meta.env as any).VITE_PLAYHT_SECRET_KEY}`,
      'X-User-ID': (import.meta.env as any).VITE_PLAYHT_USER_ID
    };
  }

  private mapVoice(voice: RawVoice): Voice {
    return {
      id: voice.id,
      name: voice.name,
      sample: voice.preview_url || voice.sample_url || '',
      accent: voice.accent || '',
      age: voice.age || '',
      gender: voice.gender || '',
      language: voice.language || '',
      language_code: voice.language_code || '',
      loudness: voice.loudness || '',
      style: voice.style || '',
      tempo: voice.tempo || '',
      texture: voice.texture || '',
      is_cloned: voice.is_cloned || false,
      voiceEngine: voice.voice_engine || (voice.is_cloned ? 'PlayHT2.0' : 'Play3.0-mini'),
      user_id: voice.user_id
    };
  }

  async getVoices(): Promise<Voice[]> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.voiceCache && (now - this.voiceCache.timestamp) < this.CACHE_DURATION) {
        console.log('Using cached voices');
        return this.voiceCache.voices;
      }

      console.log('Fetching voices from server');
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: this.getHeaders(),
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PlayHT API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to fetch voices: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw voices response:', data);
      const voiceArray: RawVoice[] = data?.voices || [];
      
      // Map voices and ensure proper engine assignment
      const voices = voiceArray.map(voice => this.mapVoice(voice));
      
      // Sort voices by language and name
      const sortedVoices = voices.sort((a: Voice, b: Voice) => {
        // First sort by language
        const langCompare = a.language.localeCompare(b.language);
        if (langCompare !== 0) return langCompare;
        // Then by name within each language
        return a.name.localeCompare(b.name);
      });

      // Cache the sorted voices
      this.voiceCache = {
        voices: sortedVoices,
        timestamp: now
      };
      
      return this.voiceCache.voices;
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
      console.log('Using voice:', options.voice);

      // Process text into optimal chunks
      const chunks = TranscriptProcessor.processText(text);
      console.log(`Split text into ${chunks.length} chunks`);

      // Initialize parallel generator if needed
      if (!this.generator) {
        this.generator = new ParallelAudioGenerator(
          2, // Use 2 workers for parallel processing
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

      // Use voice ID directly without modification
      console.log('Using voice ID:', options.voice);

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

      // Emit completion event
      window.dispatchEvent(new CustomEvent('audioGenerated', {
        detail: {
          url: finalAudioUrl,
          title: 'Generated Audio',
          transcript: text,
          totalChunks: chunks.length,
          chunkIndex: chunks.length - 1
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
        headers: this.getHeaders(),
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to clone voice: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error cloning voice:', error);
      throw error;
    }
  }

  async getClonedVoices(): Promise<Voice[]> {
    try {
      console.log('Fetching cloned voices');
      const response = await fetch(`${this.baseUrl}/cloned-voices`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cloned voices: ${response.statusText}`);
      }

      const data = await response.json();
      const voiceArray: RawVoice[] = data?.voices || [];
      const voices = voiceArray.map(voice => this.mapVoice(voice));
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

  clearCache() {
    this.voiceCache = undefined;
  }
}

export const playhtClient = new PlayHTClient();
export type { Voice, SpeechGenerationOptions, SpeechGenerationResponse };
export default playhtClient;
