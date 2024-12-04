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
  private downloadTimeout = 60000; // 60 seconds timeout for larger chunks
  private minValidDuration = 1.0; // 1 second minimum valid duration
  private maxConcurrentDownloads = 3; // Limit concurrent downloads

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
    
    // Process URLs in batches to control concurrency
    for (let i = 0; i < urls.length; i += this.maxConcurrentDownloads) {
      const batch = urls.slice(i, i + this.maxConcurrentDownloads);
      const batchPromises = batch.map(async (url, batchIndex) => {
        const index = i + batchIndex;
        const chunk = await this.downloadChunkWithRetry(url, index);
        chunks[index] = chunk;
        completedChunks++;
        
        this.onProgress({ 
          phase: 'downloading', 
          progress: (completedChunks / urls.length) * 100 
        });
      });

      await Promise.all(batchPromises);
    }

    return chunks.filter(Boolean); // Remove any undefined entries
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
            'Range': 'bytes=0-' // Request full content
          }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        console.log(`Downloaded chunk ${index}, size: ${buffer.byteLength} bytes`);

        if (buffer.byteLength === 0) {
          throw new Error(`Empty chunk received for index ${index}`);
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
          console.log(`Retrying chunk ${index} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
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

    // Verify total size is reasonable for expected duration
    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.size, 0);
    const estimatedMinutes = totalSize / (192000 * 60); // Rough estimate based on MP3 bitrate
    console.log('Chunk verification passed:', {
      totalChunks: chunks.length,
      totalSize,
      estimatedDuration: `${Math.round(estimatedMinutes * 10) / 10} minutes`
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
      }, 10000); // 10 second timeout for loading

      audio.onloadedmetadata = () => {
        clearTimeout(loadTimeout);
        const isValid = audio.duration > this.minValidDuration;
        console.log('Audio verification:', {
          duration: audio.duration,
          size: blob.size,
          isValid
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
