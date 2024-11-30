import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

interface AssemblyProgress {
  phase: 'downloading' | 'processing' | 'combining';
  progress: number;
}

export class AudioAssembler {
  private ffmpeg: FFmpeg;
  private isInitialized = false;
  private onProgress?: (progress: AssemblyProgress) => void;

  constructor(onProgress?: (progress: AssemblyProgress) => void) {
    this.ffmpeg = new FFmpeg();
    this.onProgress = onProgress;
  }

  /**
   * Initialize ffmpeg WASM
   */
  private async initialize() {
    if (!this.isInitialized) {
      // Load ffmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      });
      this.isInitialized = true;
    }
  }

  /**
   * Combine multiple audio URLs into a single audio file
   */
  async combineAudioUrls(audioUrls: string[]): Promise<Blob> {
    try {
      await this.initialize();

      // Download all audio files
      const totalFiles = audioUrls.length;
      for (let i = 0; i < totalFiles; i++) {
        this.updateProgress('downloading', (i / totalFiles) * 100);
        
        const response = await fetch(audioUrls[i]);
        const buffer = await response.arrayBuffer();
        const filename = `chunk_${i}.mp3`;
        
        await this.ffmpeg.writeFile(filename, new Uint8Array(buffer));
      }

      this.updateProgress('downloading', 100);

      // Create concat file
      const concatContent = audioUrls
        .map((_, i) => `file 'chunk_${i}.mp3'`)
        .join('\n');
      await this.ffmpeg.writeFile('concat.txt', concatContent);

      // Combine audio files
      this.updateProgress('processing', 0);
      await this.ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        'output.mp3'
      ]);
      this.updateProgress('processing', 100);

      // Read the output file
      this.updateProgress('combining', 0);
      const data = await this.ffmpeg.readFile('output.mp3');
      this.updateProgress('combining', 50);

      // Clean up files
      for (let i = 0; i < totalFiles; i++) {
        await this.ffmpeg.deleteFile(`chunk_${i}.mp3`);
      }
      await this.ffmpeg.deleteFile('concat.txt');
      await this.ffmpeg.deleteFile('output.mp3');
      this.updateProgress('combining', 100);

      // Create blob from data
      return new Blob([data], { type: 'audio/mp3' });

    } catch (error) {
      console.error('Error combining audio:', error);
      throw new Error(`Failed to combine audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process a single audio file
   */
  async processAudio(audioUrl: string, options: {
    normalize?: boolean;
    trim?: { start?: number; end?: number };
    speed?: number;
  } = {}): Promise<Blob> {
    try {
      await this.initialize();

      // Download audio file
      this.updateProgress('downloading', 0);
      const response = await fetch(audioUrl);
      const buffer = await response.arrayBuffer();
      await this.ffmpeg.writeFile('input.mp3', new Uint8Array(buffer));
      this.updateProgress('downloading', 100);

      // Build ffmpeg command
      const args: string[] = [];
      args.push('-i', 'input.mp3');

      // Add filters based on options
      const filters: string[] = [];
      if (options.normalize) {
        filters.push('loudnorm');
      }
      if (options.speed && options.speed !== 1) {
        filters.push(`atempo=${options.speed}`);
      }
      if (filters.length > 0) {
        args.push('-af', filters.join(','));
      }

      // Add trim options if specified
      if (options.trim) {
        if (options.trim.start) {
          args.push('-ss', options.trim.start.toString());
        }
        if (options.trim.end) {
          args.push('-to', options.trim.end.toString());
        }
      }

      args.push('output.mp3');

      // Process audio
      this.updateProgress('processing', 0);
      await this.ffmpeg.exec(args);
      this.updateProgress('processing', 100);

      // Read the output file
      this.updateProgress('combining', 0);
      const data = await this.ffmpeg.readFile('output.mp3');
      this.updateProgress('combining', 50);

      // Clean up files
      await this.ffmpeg.deleteFile('input.mp3');
      await this.ffmpeg.deleteFile('output.mp3');
      this.updateProgress('combining', 100);

      // Create blob from data
      return new Blob([data], { type: 'audio/mp3' });

    } catch (error) {
      console.error('Error processing audio:', error);
      throw new Error(`Failed to process audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update progress callback
   */
  private updateProgress(phase: AssemblyProgress['phase'], progress: number) {
    if (this.onProgress) {
      this.onProgress({ phase, progress });
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.isInitialized) {
      this.ffmpeg.terminate();
      this.isInitialized = false;
    }
  }
}

export type { AssemblyProgress };
