import { useState, useCallback } from 'react';
import { AudioProcessingService, AudioProcessingOptions } from '../lib/services/audioProcessingService';

interface AudioProcessingState {
  isProcessing: boolean;
  progress: {
    phase: 'processing' | 'generating' | 'assembling';
    progress: number;
    totalPhases: number;
  } | null;
  error: string | null;
  audioUrl: string | null;
}

export function useAudioProcessing() {
  const [state, setState] = useState<AudioProcessingState>({
    isProcessing: false,
    progress: null,
    error: null,
    audioUrl: null,
  });

  // Cleanup previous audio URL
  const cleanup = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
  }, [state.audioUrl]);

  const processText = useCallback(async (text: string, options: Omit<AudioProcessingOptions, 'onProgress'>) => {
    cleanup();
    
    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      audioUrl: null,
    }));

    const service = new AudioProcessingService();

    try {
      console.log('Starting audio processing with text length:', text.length);
      const processingOptions: AudioProcessingOptions = {
        ...options,
        onProgress: (progress) => {
          console.log('Audio processing progress:', progress);
          setState(prev => ({
            ...prev,
            progress: {
              phase: progress.phase,
              progress: progress.progress,
              totalPhases: progress.totalPhases,
            },
          }));
        },
      };

      // Process text to audio
      const audioBlob = await service.processText(text, processingOptions);
      console.log('Audio processing complete, blob size:', audioBlob.size);
      
      // Create URL for the audio blob
      const url = URL.createObjectURL(audioBlob);
      console.log('Created audio URL:', url);
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        audioUrl: url,
        progress: null,
      }));

      return url;
    } catch (error) {
      console.error('Error in audio processing:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'An error occurred during audio processing',
        progress: null,
      }));
      throw error;
    } finally {
      service.destroy();
    }
  }, [cleanup]);

  // Cleanup on unmount
  const unmount = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    processText,
    unmount,
    isProcessing: state.isProcessing,
    progress: state.progress,
    error: state.error,
    audioUrl: state.audioUrl,
  };
}
