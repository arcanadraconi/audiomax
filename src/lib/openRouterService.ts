interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
}

interface GeneratedContent {
  fullText: string;
  chunks: string[];
  estimatedDuration: number; // in minutes
}

interface GeneratedTitle {
  title: string;
}

export class OpenRouterService {
  private static readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  private static readonly MODEL = 'google/learnlm-1.5-pro-experimental:free';  // Using a faster model
  private static readonly TARGET_DURATION = 15; // Target full 15 minutes
  private static readonly WORDS_PER_MINUTE = 150; // Average speaking rate
  private static readonly TARGET_WORDS = OpenRouterService.TARGET_DURATION * OpenRouterService.WORDS_PER_MINUTE; // 2250 words
  private static readonly MIN_WORDS = 2500; // Minimum words needed for 15 minutes
  private static readonly MIN_CHUNK_WORDS = 700; // Minimum words per chunk
  private static readonly MAX_CHUNK_WORDS = 1000; // Maximum words per chunk
  private static readonly TARGET_CHUNKS = 9; // Target number of chunks
  private static readonly WORDS_PER_CHUNK = Math.floor(OpenRouterService.TARGET_WORDS / OpenRouterService.TARGET_CHUNKS); // ~321 words per chunk

  private static getApiKey(): string {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!key) {
      throw new Error('OpenRouter API key not found in environment variables');
    }
    return key;
  }

  private static async makeRequest(prompt: string, systemPrompt: string) {
    try {
      const headers = {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'HTTP-Referer': 'https://audiomax-40b0e.web.app',
        'X-Title': 'AudioMax',
        'Content-Type': 'application/json'
      };

      const body = {
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for faster, more focused responses
        max_tokens: 4000,
        stream: false,
        frequency_penalty: 0.3, // Reduce repetition
        presence_penalty: 0.3 // Encourage focused content
      };

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} - ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        return data as OpenRouterResponse;
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Failed to parse OpenRouter API response: ${responseText}`);
      }
    } catch (error) {
      console.error('OpenRouter API Request Error:', error);
      if (error instanceof Error) {
        throw new Error(`OpenRouter API error: ${error.message}`);
      }
      throw error;
    }
  }

  static async generateTitle(text: string): Promise<GeneratedTitle> {
    const systemPrompt = `You are a content titling expert. Create a short, engaging title for an audio piece.

Requirements:
- Maximum 6 words
- Engaging and descriptive
- No quotes or special characters
- Must reflect the main topic/theme
- Should be suitable for an audio file name

Return ONLY the title, nothing else.`;

    try {
      const response = await this.makeRequest(text, systemPrompt);
      const title = response.choices[0].message.content.trim();
      
      // Clean and validate the title
      const cleanTitle = title
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
        .trim();

      return { title: cleanTitle };
    } catch (error) {
      console.error('Error generating title:', error);
      throw error;
    }
  }

  static async generateTranscript(text: string, audience: string): Promise<GeneratedContent> {
    const systemPrompt = `You are an expert content creator specializing in ${audience} content. Create a ${this.TARGET_DURATION}-minute monologue with EXACTLY 9 sections.

CRITICAL LENGTH REQUIREMENTS:
- Total content MUST be at least ${this.MIN_WORDS} words
- Each section MUST be between ${this.MIN_CHUNK_WORDS} and ${this.MAX_CHUNK_WORDS} words
- Each section MUST end with a complete sentence
- Each section MUST flow naturally into the next

Format your response in exactly 9 sections. Mark the start of each section with [SECTION X] (these markers will be removed from the final output).

Writing style:
- Direct address ("you" and "we")
- Rhetorical questions for engagement
- Natural pauses through punctuation
- Clear topic sentences
- Strong concluding thoughts
- NO stage directions or markers
- NO meta-commentary

Topic to cover: ${text}`;

    try {
      const response = await this.makeRequest(text, systemPrompt);
      let generatedText = response.choices[0].message.content;
      
      // Split into sections based on [SECTION X] markers
      const sections = generatedText.split(/\[SECTION \d+[^\]]*\]/g).filter(Boolean);
      
      // Ensure we have exactly 7 sections
      if (sections.length !== this.TARGET_CHUNKS) {
        console.log(`Warning: Got ${sections.length} sections instead of ${this.TARGET_CHUNKS}`);
        // Split content at sentence boundaries to maintain at least 700 words per chunk
        const sentences = generatedText.match(/[^.!?]+[.!?]+/g) || [];
        const chunks: string[] = [];
        let currentChunk = '';
        let currentWords = 0;

        for (const sentence of sentences) {
          const sentenceWords = sentence.trim().split(/\s+/).length;
          
          if (currentWords + sentenceWords >= this.MIN_CHUNK_WORDS) {
            currentChunk += sentence;
            chunks.push(currentChunk.trim());
            currentChunk = '';
            currentWords = 0;
          } else {
            currentChunk += sentence;
            currentWords += sentenceWords;
          }
        }

        if (currentChunk) {
          if (chunks.length > 0 && currentWords < this.MIN_CHUNK_WORDS) {
            // Combine with last chunk if current is too small
            chunks[chunks.length - 1] += ' ' + currentChunk;
          } else {
            chunks.push(currentChunk.trim());
          }
        }

        return {
          fullText: generatedText.replace(/\[SECTION \d+[^\]]*\]/g, ''),
          chunks: chunks.map(chunk => chunk.replace(/\[SECTION \d+[^\]]*\]/g, '')),
          estimatedDuration: Math.round((generatedText.split(/\s+/).length / this.WORDS_PER_MINUTE) * 1000) / 1000
        };
      }

      // Clean up sections and remove section headers
      const chunks = sections.map(section => 
        section.trim().replace(/\[SECTION \d+[^\]]*\]/g, '').trim()
      );

      // Calculate word count and duration
      const wordCount = generatedText.split(/\s+/).filter(Boolean).length;
      const estimatedDuration = Math.round((wordCount / this.WORDS_PER_MINUTE) * 1000) / 1000;

      return {
        fullText: generatedText.replace(/\[SECTION \d+[^\]]*\]/g, ''),
        chunks,
        estimatedDuration
      };
    } catch (error) {
      console.error('Error generating transcript:', error);
      throw error;
    }
  }

  static async validateChunk(chunk: string, audience: string): Promise<string> {
    const systemPrompt = `You are an expert editor specializing in natural, conversational content for ${audience}.
    Review and optimize the following text for natural speech delivery.
    
    Requirements:
    - Maintain natural speaking rhythm
    - Ensure clear pronunciation points through punctuation
    - Keep the conversational flow
    - Remove any stage directions or narration markers
    - Preserve the direct, personal connection with the audience
    - Keep the text between ${this.MIN_CHUNK_WORDS} and ${this.MAX_CHUNK_WORDS} words
    - Must end with a complete sentence
    
    Return only the optimized text without any explanations or markers.`;

    try {
      const response = await this.makeRequest(chunk, systemPrompt);
      return response.choices[0].message.content.trim().replace(/\[SECTION \d+[^\]]*\]/g, '');
    } catch (error) {
      console.error('Error validating chunk:', error);
      throw error;
    }
  }

  static estimateChunkDuration(chunk: string): number {
    const words = chunk.split(/\s+/).filter(Boolean);
    const minutes = words.length / this.WORDS_PER_MINUTE;
    return Math.round(minutes * 1000) / 1000;
  }
}
