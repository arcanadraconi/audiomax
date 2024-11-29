import axios, { AxiosProgressEvent } from 'axios';

interface GenerationTask {
  text: string;
  voice: string;
  quality: string;
  speed: number;
  chunkIndex: number;
  totalChunks: number;
}

interface ProgressMessage {
  type: 'progress';
  chunkIndex: number;
  totalChunks: number;
  status: 'starting' | 'generating';
  progress: number;
}

interface CompleteMessage {
  type: 'complete';
  chunkIndex: number;
  audioUrl: string;
  generationId: string;
}

interface ErrorMessage {
  type: 'error';
  chunkIndex: number;
  error: string;
}

type WorkerMessage = ProgressMessage | CompleteMessage | ErrorMessage;

self.addEventListener('message', async (e: MessageEvent<GenerationTask>) => {
  const { text, voice, quality, speed, chunkIndex, totalChunks } = e.data;
  
  try {
    // Report progress start
    self.postMessage({
      type: 'progress',
      chunkIndex,
      totalChunks,
      status: 'starting',
      progress: 0
    } as WorkerMessage);

    const response = await axios.post('http://localhost:3001/api/tts', {
      text,
      voice,
      quality,
      speed
    }, {
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        const progress = progressEvent.total 
          ? (progressEvent.loaded / progressEvent.total) * 100
          : 0;
        
        self.postMessage({
          type: 'progress',
          chunkIndex,
          totalChunks,
          status: 'generating',
          progress
        } as WorkerMessage);
      }
    });

    // Report success
    self.postMessage({
      type: 'complete',
      chunkIndex,
      audioUrl: response.data.audioUrl,
      generationId: response.data.generationId
    } as WorkerMessage);

  } catch (error) {
    // Report error
    self.postMessage({
      type: 'error',
      chunkIndex,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as WorkerMessage);
  }
});
