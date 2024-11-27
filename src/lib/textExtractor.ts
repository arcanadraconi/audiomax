import * as PDFJS from 'pdfjs-dist';
import mammoth from 'mammoth';

export class TextExtractor {
  static async extractFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ');
      text += pageText + '\n\n';
    }

    return text.trim();
  }

  static async extractFromDOCX(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  static async extractFromTXT(file: File): Promise<string> {
    return await file.text();
  }

  static async extractFromMD(file: File): Promise<string> {
    return await file.text();
  }

  static async extractFromDOC(file: File): Promise<string> {
    // For DOC files, we'll just read as text and clean up any binary data
    const text = await file.text();
    return text.replace(/[^\x20-\x7E\n]/g, '').trim();
  }

  static async extract(file: File): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return await this.extractFromPDF(file);
      case 'docx':
        return await this.extractFromDOCX(file);
      case 'doc':
        return await this.extractFromDOC(file);
      case 'txt':
        return await this.extractFromTXT(file);
      case 'md':
        return await this.extractFromMD(file);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  static async validateAndExtract(file: File, maxSize: number = 5 * 1024 * 1024): Promise<string> {
    // Check file size (default 5MB)
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['pdf', 'docx', 'doc', 'txt', 'md'];
    if (!extension || !allowedTypes.includes(extension)) {
      throw new Error(`Unsupported file type: ${extension}. Allowed types: ${allowedTypes.join(', ')}`);
    }

    try {
      const text = await this.extract(file);
      
      // Basic validation of extracted text
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in file');
      }

      // Clean up text
      return text
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
        .replace(/[^\S\n]+/g, ' ') // Replace multiple spaces with single space
        .trim();

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to extract text: ${error.message}`);
      } else {
        throw new Error('Failed to extract text from file');
      }
    }
  }

  static async validateAndExtractWithStats(file: File): Promise<{
    text: string;
    stats: {
      wordCount: number;
      charCount: number;
      lineCount: number;
      estimatedDuration: number; // in minutes, based on 150 words per minute
    };
  }> {
    const text = await this.validateAndExtract(file);
    
    const stats = {
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
      lineCount: text.split('\n').length,
      estimatedDuration: 0
    };

    stats.estimatedDuration = Math.ceil(stats.wordCount / 150); // 150 words per minute

    return { text, stats };
  }
}
