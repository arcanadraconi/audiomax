import axios from 'axios';

interface ApiConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

export class ApiService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  async request<T>(method: string, url: string, data?: any): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.config.baseUrl}${url}`,
        headers: {
          ...this.config.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID'
        },
        data,
        withCredentials: false,
        validateStatus: (status) => {
          return status >= 200 && status < 500;
        }
      });

      if (response.status === 401) {
        throw new Error('Unauthorized - Check your API credentials');
      }

      if (response.status === 403) {
        throw new Error('Forbidden - You do not have access to this resource');
      }

      if (response.status >= 400) {
        throw new Error(`API Error: ${response.data?.error || response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error('API Error:', {
        error,
        url: `${this.config.baseUrl}${url}`,
        method,
        headers: this.config.headers
      });
      throw error;
    }
  }
}
