import { AssemblyProgress } from './types';

interface AudioChunk {
  index: number;
  buffer: ArrayBuffer;
  size: number;
}

export class AudioAssembler {
  private onProgress: (progress: AssemblyProgress) => void;
  private chunkSize = 5 * 1024 * 1024; // 5MB chunk size for better handling of long audio
  private maxRetries = 5; // Increased retries
  private retryDelay = 3000; // 3 seconds
  private downloadTimeout = 180000; // 180 seconds timeout for larger chunks
  private minValidDuration = 1.0; // 1 second minimum valid duration
  private maxConcurrentDownloads = 3; // Reduced concurrent downloads for stability
  private minChunkSize = 2000; // 1KB minimum chunk size
  private maxRetryDelay = 30000; // 30 seconds max retry delay

  constructor(onProgress: (progress: AssemblyProgress) => void) {
    this.onProgress = onProgress;
  }

  async combineAudioUrls(urls: string[]): Promise<Blob> {
    try {
      this.onProgress({ phase: 'downloading', progress: 0 });

      // Step 1: Download all audio chunks with controlled concurrency
      const chunks: AudioChunk[] = await this.downloadChunksWithConcurrency(urls);
      
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

  private async downloadChunksWithConcurrency(urls: string[]): Promise<AudioChunk[]> {
    const chunks: AudioChunk[] = new Array(urls.length);
    let completedChunks = 0;
    let failedAttempts = 0;
    const maxFailedAttempts = urls.length * 2; // Allow more retries for resilience
    
    // Process URLs in batches to control concurrency
    for (let i = 0; i < urls.length; i += this.maxConcurrentDownloads) {
      const batch = urls.slice(i, i + this.maxConcurrentDownloads);
      const batchPromises = batch.map(async (url, batchIndex) => {
        const index = i + batchIndex;
        try {
          const chunk = await this.downloadChunkWithRetry(url, index);
          chunks[index] = chunk;
          completedChunks++;
          
          this.onProgress({ 
            phase: 'downloading', 
            progress: (completedChunks / urls.length) * 100 
          });
        } catch (error) {
          failedAttempts++;
          if (failedAttempts > maxFailedAttempts) {
            throw new Error(`Too many failed download attempts (${failedAttempts})`);
          }
          console.error(`Failed to download chunk ${index}:`, error);
          // Retry this chunk at the end if needed
          if (i + this.maxConcurrentDownloads >= urls.length) {
            const retryChunk = await this.downloadChunkWithRetry(url, index);
            chunks[index] = retryChunk;
            completedChunks++;
          }
        }
      });

      await Promise.all(batchPromises);
    }

    const validChunks = chunks.filter(Boolean);
    if (validChunks.length !== urls.length) {
      throw new Error(`Failed to download all chunks. Expected ${urls.length}, got ${validChunks.length}`);
    }

    return validChunks;
  }

  private async downloadChunkWithRetry(url: string, index: number): Promise<AudioChunk> {
    let lastError: Error | null = null;
    let delay = this.retryDelay;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.downloadTimeout);

        const response = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'Range': 'bytes=0-', // Request full content
            'Cache-Control': 'no-cache' // Prevent caching issues
          }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        console.log(`Downloaded chunk ${index}, size: ${buffer.byteLength} bytes`);

        if (buffer.byteLength < this.minChunkSize) {
          throw new Error(`Chunk ${index} too small: ${buffer.byteLength} bytes`);
        }

        return {
          index,
          buffer,
          size: buffer.byteLength
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt + 1} failed for chunk ${index}:`, error);
        
        if (attempt < this.maxRetries - 1) {
          const currentDelay = Math.min(delay * Math.pow(2, attempt), this.maxRetryDelay);
          console.log(`Retrying chunk ${index} in ${currentDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
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
    const invalidChunks = chunks.filter(chunk => chunk.size < this.minChunkSize);
    if (invalidChunks.length > 0) {
      throw new Error(`Found ${invalidChunks.length} invalid chunks`);
    }

    // Verify total size is reasonable for expected duration
    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.size, 0);
    const estimatedMinutes = totalSize / (192000 * 60); // Rough estimate based on MP3 bitrate
    console.log('Chunk verification passed:', {
      totalChunks: chunks.length,
      totalSize,
      estimatedDuration: `${Math.round(estimatedMinutes * 10) / 10} minutes`,
      averageChunkSize: Math.round(totalSize / chunks.length)
    });

    if (estimatedMinutes < 1) {
      console.warn('Warning: Audio content may be shorter than expected');
    }
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

        // Allow other operations to process
        await new Promise(resolve => setTimeout(resolve, 0));
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
      
      const loadTimeout = setTimeout(() => {
        console.error('Audio load timeout');
        URL.revokeObjectURL(url);
        resolve(false);
      }, 30000); // 30 second timeout for loading

      audio.onloadedmetadata = () => {
        clearTimeout(loadTimeout);
        const isValid = audio.duration > this.minValidDuration;
        console.log('Audio verification:', {
          duration: audio.duration,
          size: blob.size,
          isValid,
          estimatedMinutes: Math.round(audio.duration / 60)
        });
        URL.revokeObjectURL(url);
        resolve(isValid);
      };
      
      audio.onerror = (e) => {
        clearTimeout(loadTimeout);
        console.error('Audio verification failed:', e);
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
