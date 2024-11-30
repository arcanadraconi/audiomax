/**
 * Split text into chunks based on sentence boundaries and length
 */
export function splitTextIntoChunks(text, maxLength = 1800) {
  const chunks = [];
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
 * Estimate duration in minutes based on word count
 */
export function estimateDuration(text, wordsPerMinute = 150) {
  const wordCount = text.split(/\s+/).length;
  return wordCount / wordsPerMinute;
}

/**
 * Get total word count
 */
export function getWordCount(text) {
  return text.split(/\s+/).length;
}

/**
 * Validate chunk size
 */
export function validateChunkSize(chunk, minSize = 500, maxSize = 1500) {
  return chunk.length >= minSize && chunk.length <= maxSize;
}
