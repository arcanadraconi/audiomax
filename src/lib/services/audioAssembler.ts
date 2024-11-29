import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { AudioChunk } from './parallelAudioGenerator';
import StreamSaver from 'streamsaver';

interface AssemblyProgress {
  phase: 'downloading' | 'processing' | 'combining';
  progress: number;
  totalPhases: number;
}

export class AudioAssembler {
  private ffmpeg: FFmpeg;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  private async init() {
    if (this.initialized) return;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          console.log('Initializing FFmpeg...');
          // Load ffmpeg core
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
          await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          console.log('FFmpeg initialized successfully');
          this.initialized = true;
        } catch (error) {
          console.error('Failed to initialize FFmpeg:', error);
          this.initPromise = null;
          throw error;
        }
      })();
    }

    await this.initPromise;
  }

  private async downloadChunk(chunk: AudioChunk): Promise<ArrayBuffer> {
    console.log('Downloading chunk from URL:', chunk.url);
    try {
      const response = await fetch(chunk.url);
      if (!response.ok) {
        throw new Error(`Failed to download chunk: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      console.log('Chunk downloaded successfully, size:', buffer.byteLength);
      return buffer;
    } catch (error) {
      console.error('Error downloading chunk:', error);
      throw error;
    }
  }

  private async processChunk(
    chunkData: ArrayBuffer,
    index: number
  ): Promise<string> {
    console.log(`Processing chunk ${index}, size: ${chunkData.byteLength}`);
    const inputFileName = `chunk_${index}.mp3`;
    const outputFileName = `processed_${index}.mp3`;

    try {
      // Write chunk to FFMPEG virtual filesystem
      await this.ffmpeg.writeFile(inputFileName, new Uint8Array(chunkData));

      // Process audio chunk (normalize volume, ensure consistent format)
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-af', 'loudnorm=I=-16:LRA=11:TP=-1.5',
        '-ar', '44100',
        '-ac', '2',
        '-b:a', '192k',
        outputFileName
      ]);

      // Clean up input file
      await this.ffmpeg.deleteFile(inputFileName);

      console.log(`Chunk ${index} processed successfully`);
      return outputFileName;
    } catch (error) {
      console.error(`Error processing chunk ${index}:`, error);
      throw error;
    }
  }

  private async combineChunks(
    processedFiles: string[],
    outputFileName: string
  ): Promise<Uint8Array> {
    console.log('Combining chunks:', processedFiles);
    try {
      // Create concatenation file
      const concatContent = processedFiles
        .map(file => `file '${file}'`)
        .join('\n');
      const concatFile = 'concat.txt';
      
      await this.ffmpeg.writeFile(concatFile, concatContent);

      // Combine all processed chunks
      await this.ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFile,
        '-c', 'copy',
        outputFileName
      ]);

      // Get the final audio data
      const data = await this.ffmpeg.readFile(outputFileName);
      const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(Buffer.from(data));

      // Clean up processed files and concat file
      for (const file of processedFiles) {
        await this.ffmpeg.deleteFile(file);
      }
      await this.ffmpeg.deleteFile(concatFile);
      await this.ffmpeg.deleteFile(outputFileName);

      console.log('Chunks combined successfully, final size:', uint8Array.length);
      return uint8Array;
    } catch (error) {
      console.error('Error combining chunks:', error);
      throw error;
    }
  }

  public async assembleAudio(
    chunks: AudioChunk[],
    onProgress?: (progress: AssemblyProgress) => void
  ): Promise<Blob> {
    console.log('Starting audio assembly for', chunks.length, 'chunks');
    await this.init();

    const totalChunks = chunks.length;
    const processedFiles: string[] = [];

    try {
      // Download and process each chunk
      for (let i = 0; i < chunks.length; i++) {
        if (onProgress) {
          onProgress({
            phase: 'downloading',
            progress: (i / totalChunks) * 100,
            totalPhases: 3
          });
        }

        const chunkData = await this.downloadChunk(chunks[i]);

        if (onProgress) {
          onProgress({
            phase: 'processing',
            progress: (i / totalChunks) * 100,
            totalPhases: 3
          });
        }

        const processedFile = await this.processChunk(chunkData, i);
        processedFiles.push(processedFile);
      }

      if (onProgress) {
        onProgress({
          phase: 'combining',
          progress: 0,
          totalPhases: 3
        });
      }

      // Combine all processed chunks
      const finalData = await this.combineChunks(processedFiles, 'output.mp3');

      if (onProgress) {
        onProgress({
          phase: 'combining',
          progress: 100,
          totalPhases: 3
        });
      }

      console.log('Audio assembly completed successfully');
      return new Blob([finalData], { type: 'audio/mp3' });
    } catch (error) {
      console.error('Error in audio assembly:', error);
      throw error;
    }
  }

  public async assembleAndSaveAudio(
    chunks: AudioChunk[],
    fileName: string,
    onProgress?: (progress: AssemblyProgress) => void
  ): Promise<void> {
    console.log('Starting audio assembly and save for', chunks.length, 'chunks');
    const fileStream = StreamSaver.createWriteStream(`${fileName}.mp3`);
    const writer = fileStream.getWriter();

    await this.init();

    const totalChunks = chunks.length;
    const processedFiles: string[] = [];

    try {
      // Download and process each chunk
      for (let i = 0; i < chunks.length; i++) {
        if (onProgress) {
          onProgress({
            phase: 'downloading',
            progress: (i / totalChunks) * 100,
            totalPhases: 3
          });
        }

        const chunkData = await this.downloadChunk(chunks[i]);

        if (onProgress) {
          onProgress({
            phase: 'processing',
            progress: (i / totalChunks) * 100,
            totalPhases: 3
          });
        }

        const processedFile = await this.processChunk(chunkData, i);
        processedFiles.push(processedFile);

        // Write processed chunk directly to stream
        const processedData = await this.ffmpeg.readFile(processedFile);
        const uint8Array = processedData instanceof Uint8Array ? processedData : new Uint8Array(Buffer.from(processedData));
        await writer.write(uint8Array);

        // Clean up processed file
        await this.ffmpeg.deleteFile(processedFile);
      }

      await writer.close();
      console.log('Audio assembly and save completed successfully');
    } catch (error) {
      console.error('Error in audio assembly and save:', error);
      writer.abort();
      throw error;
    }
  }

  public async destroy() {
    if (this.initialized) {
      console.log('Destroying AudioAssembler');
      await this.ffmpeg.terminate();
      this.initialized = false;
      this.initPromise = null;
    }
  }
}
