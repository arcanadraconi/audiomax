import { AssemblyProgress } from './types';

export class AudioAssembler {
  private onProgress: (progress: AssemblyProgress) => void;
  private chunkSize = 1024 * 1024; // 1MB chunk size for efficient memory usage

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

      // Step 2: Calculate total size and create output buffer
      const totalSize = audioBuffers.reduce((acc, buffer) => acc + buffer.byteLength, 0);
      console.log(`Total audio size: ${totalSize} bytes`);
      
      // Step 3: Create a buffer to hold all audio data
      const combinedBuffer = new Uint8Array(totalSize);
      
      // Step 4: Copy each chunk into the combined buffer
      let offset = 0;
      for (let i = 0; i < audioBuffers.length; i++) {
        const chunk = new Uint8Array(audioBuffers[i]);
        
        // Copy in smaller chunks to avoid memory issues
        for (let j = 0; j < chunk.length; j += this.chunkSize) {
          const end = Math.min(j + this.chunkSize, chunk.length);
          const subChunk = chunk.subarray(j, end);
          combinedBuffer.set(subChunk, offset);
          offset += subChunk.length;
          
          // Update progress based on total bytes processed
          const progress = (offset / totalSize) * 100;
          this.onProgress({ 
            phase: 'combining', 
            progress 
          });
        }
      }

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
