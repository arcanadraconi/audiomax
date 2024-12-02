import { AssemblyProgress } from './types';

interface AudioChunk {
  index: number;
  buffer: ArrayBuffer;
  size: number;
}

export class AudioAssembler {
  private onProgress: (progress: AssemblyProgress) => void;
  private chunkSize = 1024 * 1024; // 1MB chunk size for efficient memory usage
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds
  private downloadTimeout = 30000; // 30 seconds
  private minValidDuration = 0.1; // 100ms minimum valid duration

  constructor(onProgress: (progress: AssemblyProgress) => void) {
    this.onProgress = onProgress;
  }

  async combineAudioUrls(urls: string[]): Promise<Blob> {
    try {
      this.onProgress({ phase: 'downloading', progress: 0 });

      // Step 1: Download all audio chunks with retry logic
      const chunks: AudioChunk[] = await this.downloadChunks(urls);
      
      // Step 2: Verify chunk order and completeness
      this.verifyChunks(chunks);

      this.onProgress({ phase: 'combining', progress: 0 });

      // Step 3: Combine chunks into final audio
      const finalBlob = await this.combineChunks(chunks);

      // Step 4: Verify final audio
      const isValid = await this.verifyAudio(finalBlob);
      if (!isValid) {
        throw new Error('Final audio verification failed');
      }

      return finalBlob;
    } catch (error) {
      console.error('Error in audio assembly:', error);
      throw error;
    }
  }

  private async downloadChunks(urls: string[]): Promise<AudioChunk[]> {
    const chunks: AudioChunk[] = [];
    
    // Download chunks with progress tracking
    await Promise.all(
      urls.map(async (url, index) => {
        const chunk = await this.downloadChunkWithRetry(url, index);
        chunks.push(chunk);
        
        this.onProgress({ 
          phase: 'downloading', 
          progress: ((chunks.length) / urls.length) * 100 
        });
      })
    );

    return chunks;
  }

  private async downloadChunkWithRetry(url: string, index: number): Promise<AudioChunk> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.downloadTimeout);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        console.log(`Downloaded chunk ${index}, size: ${buffer.byteLength} bytes`);

        return {
          index,
          buffer,
          size: buffer.byteLength
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt + 1} failed for chunk ${index}:`, error);
        
        if (attempt < this.maxRetries - 1) {
          console.log(`Retrying chunk ${index} in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    throw lastError || new Error(`Failed to download chunk ${index}`);
  }

  private verifyChunks(chunks: AudioChunk[]) {
    // Verify we have all chunks in sequence
    const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);
    for (let i = 0; i < sortedChunks.length; i++) {
      if (sortedChunks[i].index !== i) {
        throw new Error(`Missing chunk ${i} in sequence`);
      }
    }

    // Verify chunk sizes
    const invalidChunks = chunks.filter(chunk => chunk.size === 0);
    if (invalidChunks.length > 0) {
      throw new Error(`Found ${invalidChunks.length} empty chunks`);
    }

    console.log('Chunk verification passed:', {
      totalChunks: chunks.length,
      totalSize: chunks.reduce((acc, chunk) => acc + chunk.size, 0)
    });
  }

  private async combineChunks(chunks: AudioChunk[]): Promise<Blob> {
    // Sort chunks by index
    const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);
    
    // Calculate total size
    const totalSize = sortedChunks.reduce((acc, chunk) => acc + chunk.size, 0);
    console.log(`Combining ${chunks.length} chunks, total size: ${totalSize} bytes`);
    
    // Create output buffer
    const combinedBuffer = new Uint8Array(totalSize);
    
    // Copy chunks into combined buffer
    let offset = 0;
    for (const chunk of sortedChunks) {
      const chunkData = new Uint8Array(chunk.buffer);
      
      // Copy in smaller chunks to avoid memory issues
      for (let i = 0; i < chunkData.length; i += this.chunkSize) {
        const end = Math.min(i + this.chunkSize, chunkData.length);
        const subChunk = chunkData.subarray(i, end);
        combinedBuffer.set(subChunk, offset);
        offset += subChunk.length;
        
        // Update progress
        const progress = (offset / totalSize) * 100;
        this.onProgress({ 
          phase: 'combining', 
          progress 
        });
      }
    }

    // Create and verify blob
    this.onProgress({ phase: 'encoding', progress: 0 });
    const blob = new Blob([combinedBuffer], { type: 'audio/mp3' });
    this.onProgress({ phase: 'encoding', progress: 100 });

    return blob;
  }

  private async verifyAudio(blob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);
      
      audio.onloadedmetadata = () => {
        const isValid = audio.duration > this.minValidDuration;
        console.log('Audio verification:', {
          duration: audio.duration,
          size: blob.size,
          isValid
        });
        URL.revokeObjectURL(url);
        resolve(isValid);
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
