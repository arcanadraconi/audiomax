/**
 * Split text into chunks based on sentence boundaries and length
 */
export function splitTextIntoChunks(text: string, maxLength = 1800): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentChunk = '';

  for (const sentence of sentences) {
    const cleanSentence = sentence.trim();
    
    if (currentChunk.length + cleanSentence.length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = cleanSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + cleanSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Combine multiple audio URLs into a single blob
 */
export async function combineAudioUrls(audioUrls: string[]): Promise<Blob> {
  // Download all audio files
  const audioBuffers = await Promise.all(
    audioUrls.map(async url => {
      const response = await fetch(url);
      return response.arrayBuffer();
    })
  );

  // Combine audio buffers
  const totalLength = audioBuffers.reduce((acc, buffer) => acc + buffer.byteLength, 0);
  const combinedBuffer = new Uint8Array(totalLength);
  let offset = 0;

  audioBuffers.forEach(buffer => {
    combinedBuffer.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  });

  return new Blob([combinedBuffer], { type: 'audio/mp3' });
}

/**
 * Convert seconds to formatted duration string
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate estimated duration based on word count
 */
export function estimateDuration(text: string, wordsPerMinute = 150): number {
  const wordCount = text.split(/\s+/).length;
  return wordCount / wordsPerMinute;
}

/**
 * Create an audio blob URL from base64 data
 */
export function base64ToAudioUrl(base64: string): string {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'audio/mp3' });
  
  return URL.createObjectURL(blob);
}

/**
 * Clean up blob URLs to prevent memory leaks
 */
export function cleanupAudioUrls(urls: string[]): void {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
}

/**
 * Check if audio file is valid MP3
 */
export async function validateAudioFile(file: File): Promise<boolean> {
  // Check MIME type
  if (!file.type.includes('audio/')) {
    return false;
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }

  // Check MP3 header
  const buffer = await file.arrayBuffer();
  const header = new Uint8Array(buffer.slice(0, 3));
  
  // Check for MP3 magic number (ID3 or MPEG sync)
  return (
    (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) || // ID3
    (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) // MPEG sync
  );
}

/**
 * Get audio file duration
 */
export function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      reject(new Error('Failed to load audio'));
    });
    audio.src = url;
  });
}
