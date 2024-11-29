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
    this.apiKey = import.meta.env.VITE_PLAYHT_SECRET_KEY;
    this.userId = import.meta.env.VITE_PLAYHT_USER_ID;

    if (!this.apiKey || !this.userId) {
      throw new Error('PlayHT credentials not found in environment variables');
    }

    console.log('PlayHT client initialized with:', {
      apiKey: `${this.apiKey.substring(0, 4)}...`,
      userId: `${this.userId.substring(0, 4)}...`,
      baseUrl: this.baseUrl
    });
  }

  private getHeaders() {
    return {
      'Authorization': this.apiKey,
      'X-User-ID': this.userId,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
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
          data: error.response?.data,
          headers: error.response?.headers
        });
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getVoices(): Promise<Voice[]> {
    try {
      console.log('Fetching voices from PlayHT');
      // Use the correct endpoint and parse the response
      const response = await axios.get('https://play.ht/api/v1/getVoices', {
        headers: this.getHeaders()
      });

      // Log the raw response to see its structure
      console.log('Raw voices response:', response.data);

      // Extract voices from the response and ensure proper mapping
      const rawVoices = response.data?.voices || [];
      console.log(`Fetched ${rawVoices.length} voices`);

      // Map the response to our Voice interface with proper ID handling
      const voices = rawVoices.map((voice: any) => ({
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

      // Log a few example voices to verify mapping
      console.log('Example voices:', voices.slice(0, 3));

      return voices;
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
      const data = await this.makeRequest<any>('GET', '/cloned-voices');
      const voices = Array.isArray(data) ? data : data.voices || [];
      console.log(`Fetched ${voices.length} cloned voices`);
      return voices;
    } catch (error) {
      console.error('Error fetching cloned voices:', error);
      throw error;
    }
  }

  // Method to run the test
  async test(): Promise<TestResponse> {
    try {
      console.log('Testing PlayHT API...');
      console.log('Using credentials:', {
        apiKey: `${this.apiKey.substring(0, 4)}...`,
        userId: `${this.userId.substring(0, 4)}...`
      });

      // Step 1: Convert text to speech
      console.log('Step 1: Converting text to speech...');
      const convertResponse = await this.makeRequest<any>('POST', '/convert', {
        content: ['Hello, this is a test.'],
        voice: 'en-US-JennyNeural',
        title: 'Test Audio',
        globalSpeed: '1',
        trimSilence: true
      });

      console.log('Convert response:', convertResponse);
      const { transcriptionId } = convertResponse;

      if (!transcriptionId) {
        throw new Error('No transcriptionId received');
      }

      // Step 2: Poll for the audio URL
      console.log('Step 2: Polling for audio URL...');
      let audioUrl = '';
      let attempts = 0;
      const maxAttempts = 30;
      const delay = 2000; // 2 seconds

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
        audioUrl
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
