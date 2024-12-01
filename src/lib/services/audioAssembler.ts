import { AssemblyProgress } from './types';

export class AudioAssembler {
  private onProgress: (progress: AssemblyProgress) => void;
  private audioContext: AudioContext;

  constructor(onProgress: (progress: AssemblyProgress) => void) {
    this.onProgress = onProgress;
    this.audioContext = new AudioContext();
  }

  async combineAudioUrls(urls: string[]): Promise<Blob> {
    try {
      this.onProgress({ phase: 'downloading', progress: 0 });

      // Step 1: Download and decode all audio chunks
      const audioBuffers = await Promise.all(
        urls.map(async (url, index) => {
          // Download chunk
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to download audio chunk ${index + 1}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          
          // Decode audio data
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          
          this.onProgress({ 
            phase: 'downloading', 
            progress: ((index + 1) / urls.length) * 100 
          });
          
          return audioBuffer;
        })
      );

      this.onProgress({ phase: 'combining', progress: 0 });

      // Step 2: Calculate total duration
      const totalDuration = audioBuffers.reduce((acc, buffer) => acc + buffer.duration, 0);
      
      // Step 3: Create a buffer to hold all audio data
      const combinedBuffer = this.audioContext.createBuffer(
        audioBuffers[0].numberOfChannels,
        this.audioContext.sampleRate * totalDuration,
        this.audioContext.sampleRate
      );

      // Step 4: Copy audio data from each buffer
      let offset = 0;
      audioBuffers.forEach((buffer, index) => {
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          combinedBuffer.copyToChannel(channelData, channel, offset);
        }
        offset += buffer.length;
        
        this.onProgress({ 
          phase: 'combining', 
          progress: ((index + 1) / audioBuffers.length) * 100 
        });
      });

      // Step 5: Convert to WAV format
      this.onProgress({ phase: 'encoding', progress: 0 });
      const wavBlob = await this.audioBufferToWav(combinedBuffer);
      
      // Step 6: Convert WAV to MP3
      const finalBlob = await this.wavToMp3(wavBlob);
      this.onProgress({ phase: 'encoding', progress: 100 });

      // Verify the combined audio
      const isValid = await this.verifyAudio(finalBlob);
      if (!isValid) {
        throw new Error('Audio verification failed');
      }

      console.log(`Combined ${urls.length} audio chunks successfully`);
      console.log(`Total duration: ${totalDuration} seconds`);

      return finalBlob;
    } catch (error) {
      console.error('Error combining audio chunks:', error);
      throw error;
    }
  }

  private async audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const outputBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(outputBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // Get channels
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(44 + pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
    }

    return new Blob([outputBuffer], { type: 'audio/wav' });
  }

  private async wavToMp3(wavBlob: Blob): Promise<Blob> {
    // For now, return the WAV blob as MP3 conversion requires additional libraries
    // In a production environment, you would use a proper MP3 encoder here
    return new Blob([wavBlob], { type: 'audio/mp3' });
  }

  private async verifyAudio(blob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(blob);
      
      audio.onloadedmetadata = () => {
        console.log('Combined audio duration:', audio.duration);
        URL.revokeObjectURL(audio.src);
        resolve(true);
      };
      
      audio.onerror = () => {
        console.error('Audio verification failed');
        URL.revokeObjectURL(audio.src);
        resolve(false);
      };
    });
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
