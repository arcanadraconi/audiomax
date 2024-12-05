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

interface Sentence {
  text: string;
}

export class TranscriptProcessor {
  private static readonly TARGET_DURATION = 15; // Target full 15 minutes
  private static readonly WORDS_PER_MINUTE = 140; // Adjusted to more natural speaking rate
  private static readonly TARGET_WORDS = TranscriptProcessor.TARGET_DURATION * TranscriptProcessor.WORDS_PER_MINUTE;
  private static readonly MIN_WORDS = 450; // Minimum words per chunk
  private static readonly MAX_WORDS = 1000; // Maximum words per chunk
  private static readonly TARGET_CHUNKS = Math.ceil(TranscriptProcessor.TARGET_WORDS / TranscriptProcessor.MIN_WORDS); // Dynamic chunk calculation
  private static readonly WORDS_PER_CHUNK = Math.floor(TranscriptProcessor.TARGET_WORDS / TranscriptProcessor.TARGET_CHUNKS);
  private static readonly OPTIMAL_CHUNK_SIZE = 700; // Increased optimal chunk size for longer content

  /**
   * Process text into optimal chunks for parallel processing
   */
  static processText(text: string): ProcessedChunk[] {
    console.log('Processing text into chunks...');
    console.log('Configuration:', {
      targetDuration: this.TARGET_DURATION,
      wordsPerMinute: this.WORDS_PER_MINUTE,
      targetWords: this.TARGET_WORDS,
      minWords: this.MIN_WORDS,
      maxWords: this.MAX_WORDS,
      targetChunks: this.TARGET_CHUNKS,
      wordsPerChunk: this.WORDS_PER_CHUNK,
      optimalChunkSize: this.OPTIMAL_CHUNK_SIZE
    });

    // Ensure minimum text length
    const minRequiredWords = this.TARGET_WORDS;
    const initialWordCount = text.split(/\s+/).length;
    
    if (initialWordCount < minRequiredWords) {
      console.warn(`Text length (${initialWordCount} words) is less than required minimum (${minRequiredWords} words). Expanding content...`);
      text = this.expandContent(text, minRequiredWords - initialWordCount);
    }
    
    // First split by paragraphs (multiple newlines)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    console.log(`Found ${paragraphs.length} paragraphs`);

    // Then split paragraphs into sentences while preserving paragraph boundaries
    const sentences: string[] = [];
    paragraphs.forEach(paragraph => {
      const paragraphSentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      sentences.push(...paragraphSentences.map(s => s.trim() + '\n\n')); // Add paragraph break after each sentence
    });

    console.log(`Found ${sentences.length} sentences`);

    const doc = nlp(text);
    const topics = doc.topics().json() as Topic[];

    // Initialize chunks array
    const chunks: ProcessedChunk[] = [];
    let currentChunk = '';
    let chunkWordCount = 0;
    let currentSentences: string[] = [];

    // Process sentences into chunks
    sentences.forEach((sentence, index) => {
      const cleanSentence = sentence.trim() + ' ';
      const sentenceWords = cleanSentence.split(/\s+/).length;
      const potentialWords = chunkWordCount + sentenceWords;
      const isLastSentence = index === sentences.length - 1;
      const hasParagraphBreak = sentence.includes('\n\n');

      // Force chunk break at paragraph boundaries if we have enough words
      if (hasParagraphBreak && chunkWordCount >= this.MIN_WORDS) {
        chunks.push(this.createChunk(currentChunk.trim(), chunks.length));
        currentChunk = cleanSentence;
        chunkWordCount = sentenceWords;
        currentSentences = [cleanSentence];
      }
      // Check if adding this sentence would exceed max words per chunk
      else if (potentialWords > this.MAX_WORDS && chunkWordCount >= this.MIN_WORDS) {
        chunks.push(this.createChunk(currentChunk.trim(), chunks.length));
        currentChunk = cleanSentence;
        chunkWordCount = sentenceWords;
        currentSentences = [cleanSentence];
      }
      // Check if we've reached optimal size and found a good breaking point
      else if (potentialWords >= this.OPTIMAL_CHUNK_SIZE && this.isGoodBreakingPoint(currentSentences, topics)) {
        chunks.push(this.createChunk(currentChunk.trim(), chunks.length));
        currentChunk = cleanSentence;
        chunkWordCount = sentenceWords;
        currentSentences = [cleanSentence];
      }
      else {
        currentChunk += cleanSentence;
        chunkWordCount = potentialWords;
        currentSentences.push(cleanSentence);
      }

      // Handle last sentence
      if (isLastSentence && currentChunk.length > 0) {
        // Ensure last chunk meets minimum requirements
        if (chunkWordCount < this.MIN_WORDS && chunks.length > 0) {
          // Combine with previous chunk if too small
          const previousChunk = chunks.pop()!;
          const combinedText = previousChunk.text + ' ' + currentChunk.trim();
          chunks.push(this.createChunk(combinedText, chunks.length));
        } else {
          chunks.push(this.createChunk(currentChunk.trim(), chunks.length));
        }
      }
    });

    // Log chunk information
    const totalWords = this.getTotalWordCount(chunks);
    const totalDuration = this.getEstimatedTotalDuration(chunks);
    
    console.log('Chunk processing complete:', {
      totalChunks: chunks.length,
      totalWords,
      estimatedTotalDuration: totalDuration.toFixed(2),
      averageWordsPerChunk: Math.round(totalWords / chunks.length)
    });

    chunks.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1}:`, {
        words: chunk.metadata.wordCount,
        characters: chunk.metadata.charCount,
        duration: chunk.metadata.estimatedDuration.toFixed(2),
        preview: `"${chunk.text.substring(0, 100)}..."`
      });
    });

    // Validate chunks
    this.validateChunks(chunks);

    return chunks;
  }

  /**
   * Expand content to meet minimum word count
   */
  private static expandContent(text: string, additionalWordsNeeded: number): string {
    const doc = nlp(text);
    const topics = doc.topics().json() as Topic[];
    
    let expandedText = text;
    const expansionTemplates = [
      "This is particularly important because {topic} affects many aspects of our lives.",
      "Let's explore this further by considering how {topic} impacts different scenarios.",
      "To better understand this, we should examine {topic} in more detail.",
      "This raises several important questions about {topic} that we need to address.",
      "The implications of {topic} are far-reaching and deserve careful consideration.",
      "We can't overlook the significance of {topic} in this context.",
      "It's worth noting that {topic} plays a crucial role in shaping these outcomes.",
      "When we consider {topic}, we must also think about its broader implications.",
      "This brings us to an important discussion about {topic} and its effects.",
      "The relationship between these factors and {topic} is particularly noteworthy."
    ];

    // Add expansion sentences until we reach the target word count
    while (expandedText.split(/\s+/).length < (text.split(/\s+/).length + additionalWordsNeeded)) {
      topics.forEach(topic => {
        const template = expansionTemplates[Math.floor(Math.random() * expansionTemplates.length)];
        const expansion = template.replace('{topic}', topic.text) + '\n\n';
        expandedText += expansion;
      });
    }

    return expandedText;
  }

  /**
   * Determine if the current point is a good place to break the text
   */
  private static isGoodBreakingPoint(sentences: string[], topics: Topic[]): boolean {
    if (sentences.length === 0) return false;

    const lastSentence = sentences[sentences.length - 1];
    const doc = nlp(lastSentence);

    // Check for paragraph breaks first (highest priority)
    if (lastSentence.includes('\n\n')) return true;

    // Check if sentence ends a conclusion
    const endsWithConclusion = doc.match('(finally|in conclusion|to summarize|therefore|thus|hence|overall|in summary)').found;
    if (endsWithConclusion) return true;

    // Check if next sentence starts a new topic
    const startsNewTopic = topics.some(topic => 
      lastSentence.toLowerCase().includes(topic.text.toLowerCase())
    );
    if (startsNewTopic) return true;

    // Check for transition words
    const hasTransition = doc.match('(however|moreover|furthermore|additionally|consequently|meanwhile|besides|although|despite)').found;
    if (hasTransition) return true;

    // Check for question marks or exclamation points (natural breaks)
    if (lastSentence.match(/[?!]/)) return true;

    return false;
  }

  /**
   * Create a chunk object with metadata
   */
  private static createChunk(text: string, index: number): ProcessedChunk {
    // Clean up excessive newlines while preserving paragraph structure
    const cleanText = text.replace(/\n{3,}/g, '\n\n').trim();
    const words = cleanText.split(/\s+/).length;
    const estimatedDuration = words / this.WORDS_PER_MINUTE;

    return {
      text: cleanText,
      metadata: {
        index,
        wordCount: words,
        charCount: cleanText.length,
        estimatedDuration
      }
    };
  }

  /**
   * Validate all chunks and throw error if any are invalid
   */
  private static validateChunks(chunks: ProcessedChunk[]): void {
    const invalidChunks = chunks.filter(chunk => !this.validateChunk(chunk));
    
    if (invalidChunks.length > 0) {
      console.error('Invalid chunks found:', invalidChunks.map(chunk => ({
        index: chunk.metadata.index,
        words: chunk.metadata.wordCount,
        min: this.MIN_WORDS,
        max: this.MAX_WORDS
      })));
      
      throw new Error(`Found ${invalidChunks.length} invalid chunks that don't meet size requirements`);
    }

    // Validate total duration
    const totalDuration = this.getEstimatedTotalDuration(chunks);
    if (totalDuration < this.TARGET_DURATION * 0.95) { // Increased validation threshold to 95%
      throw new Error(`Total duration (${totalDuration.toFixed(2)} minutes) is less than target (${this.TARGET_DURATION} minutes)`);
    }
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
