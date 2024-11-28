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

  constructor() {
    this.ffmpeg = new FFmpeg();
    this.init();
  }

  private async init() {
    if (!this.initialized) {
      // Load ffmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      this.initialized = true;
    }
  }

  private async downloadChunk(chunk: AudioChunk): Promise<ArrayBuffer> {
    const response = await fetch(chunk.url);
    return await response.arrayBuffer();
  }

  private async processChunk(
    chunkData: ArrayBuffer,
    index: number
  ): Promise<string> {
    const inputFileName = `chunk_${index}.mp3`;
    const outputFileName = `processed_${index}.mp3`;

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

    return outputFileName;
  }

  private async combineChunks(
    processedFiles: string[],
    outputFileName: string
  ): Promise<Uint8Array> {
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

    return uint8Array;
  }

  public async assembleAudio(
    chunks: AudioChunk[],
    onProgress?: (progress: AssemblyProgress) => void
  ): Promise<Blob> {
    await this.init();

    const totalChunks = chunks.length;
    const processedFiles: string[] = [];

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

    return new Blob([finalData], { type: 'audio/mp3' });
  }

  public async assembleAndSaveAudio(
    chunks: AudioChunk[],
    fileName: string,
    onProgress?: (progress: AssemblyProgress) => void
  ): Promise<void> {
    const fileStream = StreamSaver.createWriteStream(`${fileName}.mp3`);
    const writer = fileStream.getWriter();

    await this.init();

    const totalChunks = chunks.length;
    const processedFiles: string[] = [];

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
  }

  public async destroy() {
    if (this.initialized) {
      await this.ffmpeg.terminate();
      this.initialized = false;
    }
  }
}
