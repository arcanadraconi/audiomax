type VoiceEngine = 'Play3.0-mini' | 'PlayHT2.0-turbo' | 'PlayHT2.0' | 'PlayHT1.0' | 'Standard';

interface PlayHTConfig {
  apiKey: string;
  userId: string;
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
  url: string;
  output: {
    audio_url: string;
  };
}

class PlayHTClient {
  private apiKey: string;
  private userId: string;
  private baseUrl = 'https://api.play.ht/api/v2';

  constructor(config: PlayHTConfig) {
    this.apiKey = config.apiKey;
    this.userId = config.userId;
  }

  private getHeaders() {
    return {
      'accept': 'application/json',
      'AUTHORIZATION': this.apiKey,
      'X-USER-ID': this.userId,
      'Content-Type': 'application/json'
    };
  }

  async getVoices(): Promise<Voice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Voice API Error Response:', errorText);
        console.error('Response Status:', response.status);
        console.error('Response Headers:', Object.fromEntries(response.headers));
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, options: SpeechGenerationOptions): Promise<SpeechGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          text,
          voice: options.voice,
          quality: options.quality || 'premium',
          output_format: options.output_format || 'mp3',
          speed: options.speed,
          sample_rate: options.sample_rate,
          seed: options.seed,
          temperature: options.temperature
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Speech Generation Error Response:', errorText);
        console.error('Response Status:', response.status);
        console.error('Response Headers:', Object.fromEntries(response.headers));
        throw new Error(`Failed to generate speech: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  async cloneVoice(name: string, files: File[]): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('name', name);
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`${this.baseUrl}/cloning`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'AUTHORIZATION': this.apiKey,
          'X-USER-ID': this.userId
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Voice Cloning Error Response:', errorText);
        console.error('Response Status:', response.status);
        console.error('Response Headers:', Object.fromEntries(response.headers));
        throw new Error(`Failed to clone voice: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error cloning voice:', error);
      throw error;
    }
  }

  async getClonedVoices(): Promise<Voice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/cloned-voices`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloned Voices Error Response:', errorText);
        console.error('Response Status:', response.status);
        console.error('Response Headers:', Object.fromEntries(response.headers));
        throw new Error(`Failed to fetch cloned voices: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.voices || [];
    } catch (error) {
      console.error('Error fetching cloned voices:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const playhtClient = new PlayHTClient({
  apiKey: import.meta.env.VITE_PLAYHT_SECRET_KEY || '',
  userId: import.meta.env.VITE_PLAYHT_USER_ID || ''
});

export type { Voice, SpeechGenerationOptions, SpeechGenerationResponse };
export default playhtClient;
