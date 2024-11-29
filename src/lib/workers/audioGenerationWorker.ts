import * as Comlink from 'comlink';
import { playhtClient } from '../playht';
import type { SpeechGenerationOptions, SpeechGenerationResponse } from '../playht';

// Create a wrapper function that matches the expected type
async function generateSpeech(text: string, options: SpeechGenerationOptions): Promise<SpeechGenerationResponse> {
  try {
    console.log('Worker: Starting speech generation');
    console.log('Worker: Text length:', text.length);
    console.log('Worker: Text preview:', text.substring(0, 100));
    console.log('Worker: Options:', JSON.stringify(options, null, 2));

    // Check PlayHT client initialization
    if (!playhtClient) {
      throw new Error('PlayHT client not initialized');
    }

    // Log PlayHT credentials (without exposing sensitive data)
    console.log('Worker: PlayHT client initialized:', {
      hasApiKey: !!playhtClient['apiKey'],
      hasUserId: !!playhtClient['userId']
    });

    // Validate inputs
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required');
    }
    if (!options.voice) {
      throw new Error('Voice ID is required');
    }

    // Call PlayHT API
    console.log('Worker: Calling PlayHT API...');
    const result = await playhtClient.generateSpeech(text, {
      voice: options.voice,
      quality: options.quality || 'premium',
      output_format: 'mp3',
      speed: options.speed || 1.0,
    });

    // Validate response
    if (!result.output?.audio_url) {
      console.error('Worker: Invalid response from PlayHT:', result);
      throw new Error('No audio URL in response');
    }

    console.log('Worker: Generation successful');
    console.log('Worker: Audio URL:', result.output.audio_url);
    
    return result;
  } catch (error) {
    console.error('Worker: Speech generation error:', error);
    // Ensure error is properly serialized for transfer back to main thread
    if (error instanceof Error) {
      throw new Error(`Speech generation failed: ${error.message}`);
    }
    throw new Error('Speech generation failed with unknown error');
  }
}

// Expose the wrapper function to the main thread
console.log('Worker: Initializing and exposing generateSpeech function');
Comlink.expose(generateSpeech);
