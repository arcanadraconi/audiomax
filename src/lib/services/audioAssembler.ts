import { AssemblyProgress } from './types';

export class AudioAssembler {
  private onProgress: (progress: AssemblyProgress) => void;

  constructor(onProgress: (progress: AssemblyProgress) => void) {
    this.onProgress = onProgress;
  }

  async combineAudioUrls(urls: string[]): Promise<Blob> {
    try {
      this.onProgress({ phase: 'downloading', progress: 0 });

      // Step 1: Download all audio chunks as ArrayBuffers
      const audioBuffers = await Promise.all(
        urls.map(async (url, index) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to download audio chunk ${index + 1}`);
          }
          const buffer = await response.arrayBuffer();
          
          this.onProgress({ 
            phase: 'downloading', 
            progress: ((index + 1) / urls.length) * 100 
          });
          
          return buffer;
        })
      );

      this.onProgress({ phase: 'combining', progress: 0 });

      // Step 2: Calculate total size
      const totalSize = audioBuffers.reduce((acc, buffer) => acc + buffer.byteLength, 0);
      
      // Step 3: Create a buffer to hold all audio data
      const combinedBuffer = new Uint8Array(totalSize);
      
      // Step 4: Copy each chunk into the combined buffer
      let offset = 0;
      audioBuffers.forEach((buffer, index) => {
        const chunk = new Uint8Array(buffer);
        combinedBuffer.set(chunk, offset);
        offset += buffer.byteLength;
        
        this.onProgress({ 
          phase: 'combining', 
          progress: ((index + 1) / audioBuffers.length) * 100 
        });
      });

      // Step 5: Create final blob
      this.onProgress({ phase: 'encoding', progress: 0 });
      const finalBlob = new Blob([combinedBuffer], { type: 'audio/mp3' });
      this.onProgress({ phase: 'encoding', progress: 100 });

      // Verify the combined audio
      const isValid = await this.verifyAudio(finalBlob);
      if (!isValid) {
        throw new Error('Audio verification failed');
      }

      console.log(`Combined ${urls.length} audio chunks successfully`);
      console.log(`Total size: ${totalSize} bytes`);
      console.log(`Individual chunk sizes:`, audioBuffers.map(b => b.byteLength));

      return finalBlob;
    } catch (error) {
      console.error('Error combining audio chunks:', error);
      throw error;
    }
  }

  private async verifyAudio(blob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);
      
      audio.onloadedmetadata = () => {
        console.log('Combined audio duration:', audio.duration);
        URL.revokeObjectURL(url);
        resolve(true);
      };
      
      audio.onerror = () => {
        console.error('Audio verification failed');
        URL.revokeObjectURL(url);
        resolve(false);
      };

      audio.src = url;
    });
  }

  dispose() {
    // No cleanup needed
  }
}
