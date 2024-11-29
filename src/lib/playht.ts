import axios from 'axios';

type VoiceEngine = 'PlayHT2.0' | 'PlayHT2.0-turbo' | 'PlayHT1.0' | 'Standard';

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

interface TestResponse {
  status: string;
  audioUrl: string;
}

class PlayHTClient {
  private baseUrl: string;

  constructor() {
    // Use environment variable for server URL, fallback to localhost in development
    this.baseUrl = 'http://localhost:3001/api';
    console.log('PlayHT client initialized with baseUrl:', this.baseUrl);
  }

  async getVoices(): Promise<Voice[]> {
    try {
      console.log('Fetching voices from server');
      const response = await axios.get(`${this.baseUrl}/voices`);

      console.log('Raw voices response:', response.data);
      const voices = response.data?.voices || [];
      
      // Sort voices by name for better organization
      return voices.sort((a: Voice, b: Voice) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, options: SpeechGenerationOptions): Promise<SpeechGenerationResponse> {
    try {
      console.log('Starting speech generation');
      console.log('Text:', text);
      console.log('Options:', options);

      const response = await axios.post(`${this.baseUrl}/tts`, {
        text,
        voice: options.voice,
        quality: options.quality || 'premium',
        speed: options.speed || 1
      }, {
        timeout: 300000 // 5 minutes timeout for long texts
      });

      console.log('Generation response:', response.data);

      // Handle both single and multiple audio URLs
      if (response.data.audioUrls) {
        // Multiple chunks response
        return {
          status: 'success',
          audioUrl: response.data.audioUrls[0], // First URL for backward compatibility
          audioUrls: response.data.audioUrls,
          generationIds: response.data.generationIds,
          chunks: response.data.chunks
        };
      } else if (response.data.audioUrl) {
        // Single chunk response
        return {
          status: 'success',
          audioUrl: response.data.audioUrl,
          generationId: response.data.generationId,
          chunks: 1
        };
      } else {
        throw new Error('No audio URL received from server');
      }
    } catch (error: any) {
      console.error('Error generating speech:', error);
      // Include server error details if available
      if (error.response?.data?.error) {
        throw new Error(`Server error: ${error.response.data.error}`);
      }
      // Handle timeout errors
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Text might be too long or server is busy.');
      }
      throw error;
    }
  }

  async cloneVoice(name: string, files: File[]): Promise<any> {
    try {
      console.log('Cloning voice:', name);
      const formData = new FormData();
      formData.append('name', name);
      files.forEach(file => formData.append('files', file));

      const response = await axios.post(`${this.baseUrl}/clone`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error cloning voice:', error);
      throw error;
    }
  }

  async getClonedVoices(): Promise<Voice[]> {
    try {
      console.log('Fetching cloned voices');
      const response = await axios.get(`${this.baseUrl}/cloned-voices`);

      const voices = response.data?.voices || [];
      console.log(`Fetched ${voices.length} cloned voices`);
      return voices;
    } catch (error) {
      console.error('Error fetching cloned voices:', error);
      throw error;
    }
  }

  async test(): Promise<TestResponse> {
    try {
      console.log('Testing PlayHT API...');
      return this.generateSpeech('Hello, this is a test.', {
        voice: 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
        quality: 'premium'
      });
    } catch (error) {
      console.error('API Test Error:', error);
      throw error;
    }
  }
}

export const playhtClient = new PlayHTClient();
export type { Voice, SpeechGenerationOptions, SpeechGenerationResponse, TestResponse };
export default playhtClient;
