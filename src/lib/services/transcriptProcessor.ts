import nlp from 'compromise';

export interface ProcessedChunk {
  text: string;
  index: number;
  wordCount: number;
}

export class TranscriptProcessor {
  private maxWordsPerChunk: number;

  constructor(maxWordsPerChunk = 100) {
    this.maxWordsPerChunk = maxWordsPerChunk;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private splitIntoSentences(text: string): string[] {
    const doc = nlp(text);
    return doc.sentences().out('array');
  }

  private optimizeChunk(text: string): string {
    // Use compromise for text cleanup and optimization
    const doc = nlp(text);
    
    // Clean up text
    const cleaned = doc.normalize({
      whitespace: true,
      punctuation: true,
      case: true,
      numbers: true,
      contractions: true
    }).text();
    
    return cleaned;
  }

  public processTranscript(text: string): ProcessedChunk[] {
    const sentences = this.splitIntoSentences(text);
    const chunks: ProcessedChunk[] = [];
    let currentChunk: string[] = [];
    let currentWordCount = 0;
    let chunkIndex = 0;

    sentences.forEach((sentence) => {
      const sentenceWordCount = this.countWords(sentence);

      // If a single sentence exceeds max words, split it further
      if (sentenceWordCount > this.maxWordsPerChunk) {
        if (currentChunk.length > 0) {
          // Process existing chunk before handling long sentence
          const chunkText = this.optimizeChunk(currentChunk.join(' '));
          chunks.push({
            text: chunkText,
            index: chunkIndex++,
            wordCount: currentWordCount
          });
          currentChunk = [];
          currentWordCount = 0;
        }

        // Split long sentence into smaller chunks
        const words = sentence.split(/\s+/);
        let tempChunk: string[] = [];
        let tempWordCount = 0;

        words.forEach((word) => {
          tempChunk.push(word);
          tempWordCount++;

          if (tempWordCount >= this.maxWordsPerChunk) {
            const chunkText = this.optimizeChunk(tempChunk.join(' '));
            chunks.push({
              text: chunkText,
              index: chunkIndex++,
              wordCount: tempWordCount
            });
            tempChunk = [];
            tempWordCount = 0;
          }
        });

        // Handle remaining words in the long sentence
        if (tempChunk.length > 0) {
          const chunkText = this.optimizeChunk(tempChunk.join(' '));
          chunks.push({
            text: chunkText,
            index: chunkIndex++,
            wordCount: tempWordCount
          });
        }
      } else if (currentWordCount + sentenceWordCount > this.maxWordsPerChunk) {
        // Current chunk would exceed max words, create new chunk
        const chunkText = this.optimizeChunk(currentChunk.join(' '));
        chunks.push({
          text: chunkText,
          index: chunkIndex++,
          wordCount: currentWordCount
        });
        currentChunk = [sentence];
        currentWordCount = sentenceWordCount;
      } else {
        // Add sentence to current chunk
        currentChunk.push(sentence);
        currentWordCount += sentenceWordCount;
      }
    });

    // Handle remaining text in the last chunk
    if (currentChunk.length > 0) {
      const chunkText = this.optimizeChunk(currentChunk.join(' '));
      chunks.push({
        text: chunkText,
        index: chunkIndex,
        wordCount: currentWordCount
      });
    }

    return chunks;
  }

  public validateChunk(chunk: string): boolean {
    // Validate chunk length
    if (chunk.length === 0 || chunk.length > 5000) { // PlayHT typical limit
      return false;
    }

    // Check for valid characters and structure
    const doc = nlp(chunk);
    const sentences = doc.sentences().out('array');
    
    // Ensure chunk has at least one valid sentence
    if (sentences.length === 0) {
      return false;
    }

    // Check for basic punctuation and structure
    const hasValidPunctuation = /[.!?]/.test(chunk);
    const hasValidWords = this.countWords(chunk) > 0;

    return hasValidPunctuation && hasValidWords;
  }

  public estimateProcessingTime(chunks: ProcessedChunk[]): number {
    // Rough estimate based on typical TTS processing times
    // Average processing time per word (in milliseconds)
    const avgTimePerWord = 100;
    
    const totalWords = chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
    return totalWords * avgTimePerWord;
  }
}
