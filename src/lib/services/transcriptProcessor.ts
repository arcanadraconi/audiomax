import nlp from 'compromise';

interface ChunkMetadata {
  index: number;
  wordCount: number;
  charCount: number;
  estimatedDuration: number;
}

interface ProcessedChunk {
  text: string;
  metadata: ChunkMetadata;
}

interface Topic {
  text: string;
  count: number;
  normal: string;
}

export class TranscriptProcessor {
  private static readonly WORDS_PER_MINUTE = 150; // Average speaking rate
  private static readonly TARGET_CHUNK_SIZE = 1000; // Target characters per chunk
  private static readonly MAX_CHUNK_SIZE = 1500; // Maximum characters per chunk
  private static readonly MIN_CHUNK_SIZE = 500; // Minimum characters per chunk

  /**
   * Process text into optimal chunks for parallel processing
   */
  static processText(text: string): ProcessedChunk[] {
    // Use regex to split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const doc = nlp(text);
    const topics = doc.topics().json() as Topic[];

    // Initialize chunks array
    const chunks: ProcessedChunk[] = [];
    let currentChunk = '';
    let currentSentences: string[] = [];

    // Process sentences into chunks
    sentences.forEach((sentence, index) => {
      const cleanSentence = sentence.trim();
      const potentialChunk = currentChunk + cleanSentence;

      // Check if adding this sentence would exceed max chunk size
      if (potentialChunk.length > this.MAX_CHUNK_SIZE && currentChunk.length > this.MIN_CHUNK_SIZE) {
        // Add current chunk to chunks array
        chunks.push(this.createChunk(currentChunk, chunks.length));
        currentChunk = cleanSentence;
        currentSentences = [cleanSentence];
      } else {
        currentChunk = potentialChunk;
        currentSentences.push(cleanSentence);
      }

      // Check if we're at a good breaking point
      if (this.isGoodBreakingPoint(currentSentences, topics) && currentChunk.length >= this.TARGET_CHUNK_SIZE) {
        chunks.push(this.createChunk(currentChunk, chunks.length));
        currentChunk = '';
        currentSentences = [];
      }
    });

    // Add any remaining text as the final chunk
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(currentChunk, chunks.length));
    }

    return chunks;
  }

  /**
   * Determine if the current point is a good place to break the text
   */
  private static isGoodBreakingPoint(sentences: string[], topics: Topic[]): boolean {
    if (sentences.length === 0) return false;

    const lastSentence = sentences[sentences.length - 1];
    const doc = nlp(lastSentence);

    // Check if sentence ends a conclusion
    const endsWithConclusion = doc.match('(finally|in conclusion|to summarize|therefore|thus|hence)').found;
    if (endsWithConclusion) return true;

    // Check if next sentence starts a new topic
    const startsNewTopic = topics.some(topic => 
      lastSentence.toLowerCase().includes(topic.text.toLowerCase())
    );
    if (startsNewTopic) return true;

    // Check for natural breaks like paragraph markers
    if (lastSentence.includes('\n\n')) return true;

    return false;
  }

  /**
   * Create a chunk object with metadata
   */
  private static createChunk(text: string, index: number): ProcessedChunk {
    const words = text.split(/\s+/).length;
    const estimatedDuration = words / this.WORDS_PER_MINUTE;

    return {
      text: text.trim(),
      metadata: {
        index,
        wordCount: words,
        charCount: text.length,
        estimatedDuration
      }
    };
  }

  /**
   * Validate a chunk to ensure it meets requirements
   */
  static validateChunk(chunk: ProcessedChunk): boolean {
    return (
      chunk.text.length >= this.MIN_CHUNK_SIZE &&
      chunk.text.length <= this.MAX_CHUNK_SIZE &&
      chunk.metadata.wordCount > 0
    );
  }

  /**
   * Get estimated total duration for all chunks
   */
  static getEstimatedTotalDuration(chunks: ProcessedChunk[]): number {
    return chunks.reduce((total, chunk) => total + chunk.metadata.estimatedDuration, 0);
  }

  /**
   * Get total word count for all chunks
   */
  static getTotalWordCount(chunks: ProcessedChunk[]): number {
    return chunks.reduce((total, chunk) => total + chunk.metadata.wordCount, 0);
  }
}

export type { ProcessedChunk, ChunkMetadata };
