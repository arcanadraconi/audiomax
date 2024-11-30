interface AssemblyProgress {
  phase: 'downloading' | 'combining' | 'encoding';
  progress: number;
}

export class AudioAssembler {
  private onProgress: (progress: AssemblyProgress) => void;

  constructor(onProgress: (progress: AssemblyProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Combine multiple audio URLs into a single audio blob
   */
  async combineAudioUrls(urls: string[]): Promise<Blob> {
    try {
      // Step 1: Download all audio blobs
      this.onProgress({ phase: 'downloading', progress: 0 });
      const audioBlobs = await this.downloadAudioFiles(urls);
      this.onProgress({ phase: 'downloading', progress: 100 });

      // Step 2: Convert blobs to array buffers
      this.onProgress({ phase: 'combining', progress: 0 });
      const audioBuffers = await this.convertBlobsToArrayBuffers(audioBlobs);
      this.onProgress({ phase: 'combining', progress: 50 });

      // Step 3: Combine array buffers
      const combinedBuffer = await this.concatenateAudioBuffers(audioBuffers);
      this.onProgress({ phase: 'combining', progress: 100 });

      // Step 4: Create final blob
      this.onProgress({ phase: 'encoding', progress: 0 });
      const finalBlob = new Blob([combinedBuffer], { type: 'audio/mp3' });
      this.onProgress({ phase: 'encoding', progress: 100 });

      return finalBlob;
    } catch (error) {
      console.error('Error combining audio:', error);
      throw error;
    }
  }

  /**
   * Download all audio files as blobs
   */
  private async downloadAudioFiles(urls: string[]): Promise<Blob[]> {
    const downloads = urls.map(async (url, index) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download audio file ${index + 1}`);
        }
        const blob = await response.blob();
        this.onProgress({
          phase: 'downloading',
          progress: ((index + 1) / urls.length) * 100
        });
        return blob;
      } catch (error) {
        console.error(`Error downloading audio file ${index + 1}:`, error);
        throw error;
      }
    });

    return Promise.all(downloads);
  }

  /**
   * Convert blobs to array buffers
   */
  private async convertBlobsToArrayBuffers(blobs: Blob[]): Promise<ArrayBuffer[]> {
    const conversions = blobs.map(async (blob, index) => {
      try {
        const buffer = await blob.arrayBuffer();
        this.onProgress({
          phase: 'combining',
          progress: ((index + 1) / blobs.length) * 25 + 25
        });
        return buffer;
      } catch (error) {
        console.error(`Error converting blob ${index + 1} to array buffer:`, error);
        throw error;
      }
    });

    return Promise.all(conversions);
  }

  /**
   * Concatenate array buffers into a single buffer
   */
  private async concatenateAudioBuffers(buffers: ArrayBuffer[]): Promise<ArrayBuffer> {
    try {
      // Calculate total length
      const totalLength = buffers.reduce((total, buffer) => total + buffer.byteLength, 0);
      
      // Create new buffer of combined length
      const combinedBuffer = new ArrayBuffer(totalLength);
      const combinedView = new Uint8Array(combinedBuffer);
      
      // Copy each buffer into the combined buffer
      let offset = 0;
      buffers.forEach((buffer, index) => {
        const view = new Uint8Array(buffer);
        combinedView.set(view, offset);
        offset += buffer.byteLength;
        
        this.onProgress({
          phase: 'combining',
          progress: ((index + 1) / buffers.length) * 25 + 75
        });
      });
      
      return combinedBuffer;
    } catch (error) {
      console.error('Error concatenating audio buffers:', error);
      throw error;
    }
  }
}

export type { AssemblyProgress };
