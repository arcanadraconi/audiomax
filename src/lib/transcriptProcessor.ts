import natural from 'natural';
import nlp from 'compromise';

interface ProcessedTranscript {
  chunks: string[];
  metadata: {
    totalWords: number;
    totalChars: number;
    estimatedDuration: number; // in minutes
    readingLevel: string;
    sentiment: string;
    topics: string[];
  };
}

interface TfIdfItem {
  term: string;
  tfidf: number;
}

export class TranscriptProcessor {
  private static readonly WORDS_PER_MINUTE = 150;
  private static readonly CHUNK_SIZE = 1800; // characters
  private static readonly MIN_CHUNK_SIZE = 500; // characters
  private static readonly sentenceTokenizer = new natural.SentenceTokenizer();

  static async process(text: string): Promise<ProcessedTranscript> {
    // Clean and normalize text
    const cleanText = this.cleanText(text);

    // Split into optimal chunks
    const chunks = this.createOptimalChunks(cleanText);

    // Analyze text
    const metadata = await this.analyzeText(cleanText);

    return {
      chunks,
      metadata
    };
  }

  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special characters except punctuation
      .trim();
  }

  private static createOptimalChunks(text: string): string[] {
    // Get sentences
    const sentences = this.sentenceTokenizer.tokenize(text);
    const chunks: string[] = [];
    let currentText = '';

    for (const sentence of sentences) {
      const potentialChunk = currentText + (currentText ? ' ' : '') + sentence;

      if (potentialChunk.length > this.CHUNK_SIZE) {
        if (currentText) {
          chunks.push(currentText.trim());
          currentText = sentence;
        } else {
          // If a single sentence is too long, split at natural breaks
          const parts = this.splitLongSentence(sentence);
          chunks.push(...parts.slice(0, -1));
          currentText = parts[parts.length - 1];
        }
      } else {
        currentText = potentialChunk;
      }
    }

    if (currentText) {
      chunks.push(currentText.trim());
    }

    // Optimize chunk sizes
    return this.balanceChunks(chunks);
  }

  private static splitLongSentence(sentence: string): string[] {
    const parts: string[] = [];
    let currentPart = '';

    // Try to split at natural pause points (commas, semicolons, etc.)
    const pausePoints = sentence.match(/[^,;:]+[,;:]+/g) || [sentence];

    for (const point of pausePoints) {
      if ((currentPart + point).length > this.CHUNK_SIZE) {
        if (currentPart) {
          parts.push(currentPart.trim());
          currentPart = point;
        } else {
          // If still too long, split by words
          const words = point.split(' ');
          for (const word of words) {
            if ((currentPart + ' ' + word).length > this.CHUNK_SIZE) {
              parts.push(currentPart.trim());
              currentPart = word;
            } else {
              currentPart += (currentPart ? ' ' : '') + word;
            }
          }
        }
      } else {
        currentPart += (currentPart ? ' ' : '') + point;
      }
    }

    if (currentPart) {
      parts.push(currentPart.trim());
    }

    return parts;
  }

  private static balanceChunks(chunks: string[]): string[] {
    const balanced: string[] = [];
    let currentChunk = '';

    for (const chunk of chunks) {
      if (chunk.length < this.MIN_CHUNK_SIZE && balanced.length > 0) {
        // Combine small chunks with previous chunk if possible
        const lastChunk = balanced[balanced.length - 1];
        if ((lastChunk + ' ' + chunk).length <= this.CHUNK_SIZE) {
          balanced[balanced.length - 1] = lastChunk + ' ' + chunk;
          continue;
        }
      }
      if (currentChunk) {
        balanced.push(currentChunk);
      }
      currentChunk = chunk;
    }

    if (currentChunk) {
      balanced.push(currentChunk);
    }

    return balanced;
  }

  private static async analyzeText(text: string): Promise<ProcessedTranscript['metadata']> {
    const words = text.split(/\s+/).filter(Boolean);
    const doc = nlp(text);

    // Calculate reading level using Flesch-Kincaid
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);
    const sentences = this.sentenceTokenizer.tokenize(text).length;
    const readingLevel = this.calculateReadingLevel(words.length, sentences, syllables);

    // Extract topics using TF-IDF
    const tfidfAnalyzer = new natural.TfIdf();
    tfidfAnalyzer.addDocument(text);
    const topics = this.extractTopics(tfidfAnalyzer);

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(doc);

    return {
      totalWords: words.length,
      totalChars: text.length,
      estimatedDuration: Math.ceil(words.length / this.WORDS_PER_MINUTE),
      readingLevel,
      sentiment,
      topics
    };
  }

  private static countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  private static calculateReadingLevel(words: number, sentences: number, syllables: number): string {
    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    
    if (score > 90) return 'Very Easy';
    if (score > 80) return 'Easy';
    if (score > 70) return 'Fairly Easy';
    if (score > 60) return 'Standard';
    if (score > 50) return 'Fairly Difficult';
    if (score > 30) return 'Difficult';
    return 'Very Difficult';
  }

  private static extractTopics(tfidfAnalyzer: natural.TfIdf): string[] {
    const topics: string[] = [];
    tfidfAnalyzer.listTerms(0).slice(0, 5).forEach((item: TfIdfItem) => {
      topics.push(item.term);
    });
    return topics;
  }

  private static analyzeSentiment(doc: any): string {
    const positive = doc.match('#Positive').length;
    const negative = doc.match('#Negative').length;
    
    if (positive > negative * 2) return 'Very Positive';
    if (positive > negative) return 'Positive';
    if (negative > positive * 2) return 'Very Negative';
    if (negative > positive) return 'Negative';
    return 'Neutral';
  }

  static validateChunk(chunk: string): boolean {
    if (!chunk || chunk.length > this.CHUNK_SIZE) return false;
    
    const sentences = this.sentenceTokenizer.tokenize(chunk);
    if (sentences.length === 0) return false;
    
    // Check if chunk ends with proper punctuation
    const lastChar = chunk.trim().slice(-1);
    if (!'.!?'.includes(lastChar)) return false;
    
    return true;
  }

  static optimizeChunk(chunk: string): string {
    // Clean up whitespace
    let optimized = chunk.replace(/\s+/g, ' ').trim();
    
    // Ensure proper sentence endings
    if (!'.!?'.includes(optimized.slice(-1))) {
      optimized += '.';
    }
    
    // Break long sentences at natural pause points
    if (optimized.length > this.CHUNK_SIZE) {
      const parts = this.splitLongSentence(optimized);
      optimized = parts[0];
    }
    
    return optimized;
  }
}
