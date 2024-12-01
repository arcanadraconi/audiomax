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
  private static readonly TARGET_DURATION = 15; // Target full 15 minutes
  private static readonly WORDS_PER_MINUTE = 150; // Average speaking rate
  private static readonly TARGET_WORDS = TranscriptProcessor.TARGET_DURATION * TranscriptProcessor.WORDS_PER_MINUTE;
  private static readonly MIN_WORDS = 1500; // Minimum words per chunk
  private static readonly MAX_WORDS = 2500; // Maximum words per chunk
  private static readonly TARGET_CHUNKS = 9; // Target number of chunks for parallel processing
  private static readonly WORDS_PER_CHUNK = Math.floor(TranscriptProcessor.TARGET_WORDS / TranscriptProcessor.TARGET_CHUNKS);

  /**
   * Process text into optimal chunks for parallel processing
   */
  static processText(text: string): ProcessedChunk[] {
    console.log('Processing text into chunks...');
    console.log('Target words per chunk:', this.WORDS_PER_CHUNK);
    
    // Split text into words while preserving sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const doc = nlp(text);
    const topics = doc.topics().json() as Topic[];

    console.log(`Found ${sentences.length} sentences`);

    // Initialize chunks array
    const chunks: ProcessedChunk[] = [];
    let currentChunk = '';
    let currentWords = 0;
    let currentSentences: string[] = [];

    // Process sentences into chunks
    sentences.forEach((sentence, index) => {
      const cleanSentence = sentence.trim() + ' ';
      const sentenceWords = cleanSentence.split(/\s+/).length;
      const potentialWords = currentWords + sentenceWords;

      // Check if adding this sentence would exceed max words per chunk
      if (potentialWords > this.MAX_WORDS && currentWords >= this.MIN_WORDS) {
        // Add current chunk to chunks array
        chunks.push(this.createChunk(currentChunk.trim(), chunks.length));
        currentChunk = cleanSentence;
        currentWords = sentenceWords;
        currentSentences = [cleanSentence];
      } else if (potentialWords >= this.WORDS_PER_CHUNK && this.isGoodBreakingPoint(currentSentences, topics)) {
        // If we've reached target words and found a good breaking point
        chunks.push(this.createChunk(currentChunk.trim(), chunks.length));
        currentChunk = cleanSentence;
        currentWords = sentenceWords;
        currentSentences = [cleanSentence];
      } else {
        currentChunk += cleanSentence;
        currentWords = potentialWords;
        currentSentences.push(cleanSentence);
      }

      // Handle last sentence
      if (index === sentences.length - 1 && currentChunk.length > 0) {
        chunks.push(this.createChunk(currentChunk.trim(), chunks.length));
      }
    });

    // Log chunk information
    chunks.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1}:`);
      console.log(`- Words: ${chunk.metadata.wordCount}`);
      console.log(`- Characters: ${chunk.metadata.charCount}`);
      console.log(`- Estimated duration: ${chunk.metadata.estimatedDuration.toFixed(2)} minutes`);
      console.log(`- First 100 chars: "${chunk.text.substring(0, 100)}..."`);
    });

    // Validate all chunks
    const invalidChunks = chunks.filter(chunk => !this.validateChunk(chunk));
    if (invalidChunks.length > 0) {
      console.warn(`Found ${invalidChunks.length} invalid chunks:`);
      invalidChunks.forEach(chunk => {
        console.warn(`- Chunk ${chunk.metadata.index}: ${chunk.metadata.wordCount} words`);
      });
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

    // Check for transition words
    const hasTransition = doc.match('(however|moreover|furthermore|additionally|consequently)').found;
    if (hasTransition) return true;

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
    const wordCount = chunk.metadata.wordCount;
    return (
      wordCount >= this.MIN_WORDS &&
      wordCount <= this.MAX_WORDS
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
