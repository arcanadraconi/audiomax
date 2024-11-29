import axios from 'axios';

type VoiceEngine = 'Play3.0-mini' | 'PlayHT2.0-turbo' | 'PlayHT2.0' | 'PlayHT1.0' | 'Standard';

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
  voice_engine: VoiceEngine;
}

interface SpeechGenerationOptions {
  voice: string;
  quality?: 'draft' | 'low' | 'medium' | 'high' | 'premium';
  output_format?: 'mp3' | 'wav';
  speed?: number;
  sample_rate?: number;
  seed?: number;
  temperature?: number;
}

interface SpeechGenerationResponse {
  status: string;
  transcriptionId: string;
  contentLength: number;
  wordCount: number;
  audioUrl: string;
}

interface TestResponse {
  status: string;
  transcriptionId: string;
  audioUrl: string;
}

class PlayHTClient {
  private apiKey: string;
  private userId: string;
  private baseUrl = 'https://play.ht/api/v1';

  constructor() {
    const rawApiKey = import.meta.env.VITE_PLAYHT_SECRET_KEY || '';
    this.apiKey = rawApiKey.startsWith('Bearer ') ? rawApiKey : `Bearer ${rawApiKey}`;
    this.userId = import.meta.env.VITE_PLAYHT_USER_ID || '';

    if (!this.apiKey || !this.userId) {
      throw new Error('PlayHT credentials not found in environment variables');
    }

    console.log('PlayHT client initialized with:', {
      apiKey: `${this.apiKey.substring(0, 10)}...`,
      userId: `${this.userId.substring(0, 4)}...`,
      baseUrl: this.baseUrl
    });
  }

  private getHeaders() {
    return {
      'Authorization': this.apiKey,
      'X-User-ID': this.userId,
      'Content-Type': 'application/json'
    };
  }

  private async makeRequest<T>(method: string, url: string, data?: any): Promise<T> {
    try {
      console.log(`Making ${method} request to ${url}`);
      if (data) {
        console.log('Request data:', JSON.stringify(data, null, 2));
      }

      console.log('Request headers:', {
        ...this.getHeaders(),
        Authorization: `${this.getHeaders().Authorization.substring(0, 15)}...`
      });

      const response = await axios({
        method,
        url: `${this.baseUrl}${url}`,
        headers: this.getHeaders(),
        data
      });

      console.log('Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        throw new Error(`API Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  async getVoices(): Promise<Voice[]> {
    try {
      console.log('Fetching voices from PlayHT');
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/getVoices`,
        headers: this.getHeaders()
      });

      // Log the raw response to see its structure
      console.log('Raw voices response:', response.data);

      // Extract voices array from response
      const voices = response.data?.voices || [];
      console.log(`Fetched ${voices.length} voices`);

      // Map the response to our Voice interface with proper ID handling
      return voices.map((voice: any) => ({
        id: voice.voice_id || voice.id || `${voice.name}-${voice.language}`,
        name: voice.name,
        sample: voice.sample,
        accent: voice.accent,
        age: voice.age,
        gender: voice.gender,
        language: voice.language,
        language_code: voice.language_code,
        loudness: voice.loudness,
        style: voice.style,
        tempo: voice.tempo,
        texture: voice.texture,
        is_cloned: voice.is_cloned || false,
        voice_engine: voice.voice_engine
      }));
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

      // Step 1: Convert text to speech
      const convertResponse = await this.makeRequest<any>('POST', '/convert', {
        content: [text],
        voice: options.voice,
        title: 'Generated Audio',
        globalSpeed: options.speed || "1",
        trimSilence: true
      });

      console.log('Convert response:', convertResponse);
      const { transcriptionId } = convertResponse;

      if (!transcriptionId) {
        throw new Error('No transcriptionId received from conversion');
      }

      // Step 2: Get the audio URL
      let audioUrl = '';
      let attempts = 0;
      const maxAttempts = 30;
      const delay = 2000; // 2 seconds

      console.log('Polling for audio URL...');
      while (attempts < maxAttempts) {
        try {
          console.log(`Polling attempt ${attempts + 1}/${maxAttempts}`);
          const articleResponse = await this.makeRequest<any>('GET', `/articleStatus?transcriptionId=${transcriptionId}`);

          if (articleResponse.converted && articleResponse.audioUrl) {
            audioUrl = articleResponse.audioUrl;
            console.log('Audio URL received:', audioUrl);
            break;
          }

          console.log('Audio not ready yet, waiting...');
        } catch (error) {
          console.log(`Polling attempt ${attempts + 1} failed:`, error);
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (!audioUrl) {
        throw new Error('Failed to get audio URL after maximum attempts');
      }

      return {
        status: 'success',
        transcriptionId,
        contentLength: text.length,
        wordCount: text.split(/\s+/).length,
        audioUrl
      };
    } catch (error) {
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

      const response = await axios.post(`${this.baseUrl}/clone`, formData, {
        headers: {
          ...this.getHeaders(),
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
      const response = await axios.get(`${this.baseUrl}/cloned-voices`, {
        headers: this.getHeaders()
      });

      const voices = Array.isArray(response.data) ? response.data : [];
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
      console.log('Using credentials:', {
        apiKey: `${this.apiKey.substring(0, 15)}...`,
        userId: `${this.userId.substring(0, 4)}...`
      });

      const response = await this.makeRequest<any>('POST', '/convert', {
        content: ['Hello, this is a test.'],
        voice: 'en-US-JennyNeural',
        title: 'Test Audio',
        globalSpeed: '1',
        trimSilence: true
      });

      console.log('Test response:', response);
      const { transcriptionId } = response;

      if (!transcriptionId) {
        throw new Error('No transcriptionId received');
      }

      // Get the audio URL
      const articleResponse = await this.makeRequest<any>('GET', `/articleStatus?transcriptionId=${transcriptionId}`);
      
      if (!articleResponse.audioUrl) {
        throw new Error('No audio URL received');
      }

      return {
        status: 'success',
        transcriptionId,
        audioUrl: articleResponse.audioUrl
      };
    } catch (error) {
      console.error('API Test Error:', error);
      throw error;
    }
  }
}

export const playhtClient = new PlayHTClient();
export type { Voice, SpeechGenerationOptions, SpeechGenerationResponse, TestResponse };
export default playhtClient;
