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

export class OpenRouterService {
  private static readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  private static readonly MODEL = 'meta-llama/llama-3.2-90b-vision-instruct';
  private static readonly TARGET_DURATION = 15; // Target full 15 minutes
  private static readonly WORDS_PER_MINUTE = 150; // Average speaking rate
  private static readonly TARGET_WORDS = OpenRouterService.TARGET_DURATION * OpenRouterService.WORDS_PER_MINUTE; // 2250 words
  private static readonly MIN_WORDS = 2000; // Minimum words needed for 13 minutes
  private static readonly CHUNK_SIZE = 1800;
  private static readonly MIN_CHUNKS = 5; // Minimum number of chunks required

  private static getApiKey(): string {
    // For tests, use process.env; for runtime, use import.meta.env
    return typeof process !== 'undefined' && process.env.VITE_OPENROUTER_API_KEY
      ? process.env.VITE_OPENROUTER_API_KEY
      : (window as any).ENV_VITE_OPENROUTER_API_KEY || '';
  }

  private static async makeRequest(prompt: string, systemPrompt: string) {
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'HTTP-Referer': 'https://audiomax-40b0e.web.app/',
        'X-Title': 'AudioMax',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    return response.json() as Promise<OpenRouterResponse>;
  }

  static async generateTranscript(text: string, audience: string): Promise<GeneratedContent> {
    const systemPrompt = `You are an expert content creator who specializes in creating engaging ${audience} content.
    Transform the given topic into a natural, conversational monologue that will take exactly ${this.TARGET_DURATION} minutes to deliver.
    
    Key Requirements:
    - Generate EXACTLY ${this.TARGET_WORDS} words (this is critical for timing)
    - Content MUST be substantial enough for a ${this.TARGET_DURATION}-minute talk
    - Create at least ${this.MIN_CHUNKS} major sections or points
    - Each section should be detailed and thorough
    - Include real-world examples and practical applications
    - Use natural transitions between sections
    - Maintain consistent pacing throughout
    
    Content Structure:
    1. Strong opening hook (1-2 minutes)
    2. Clear introduction of the main topic (2-3 minutes)
    3. 3-4 detailed main points with examples (8-9 minutes)
    4. Practical applications or actionable steps (2-3 minutes)
    5. Compelling conclusion (1-2 minutes)
    
    Writing Style:
    - Write in a natural, conversational tone
    - Use direct address ("you" and "we")
    - Include rhetorical questions for engagement
    - Create natural pauses through sentence structure
    - NO stage directions or sound effects
    - NO "[Narrator]" or similar markers
    - Let emphasis come through word choice and sentence structure
    
    Remember:
    - The content MUST be long enough for ${this.TARGET_DURATION} minutes
    - Aim for EXACTLY ${this.TARGET_WORDS} words
    - Each main point should be thoroughly explored
    - Include specific examples and detailed explanations
    - Create natural breaking points for chunking
    
    If the generated content is too short, expand each point with:
    - More detailed examples
    - Additional context
    - Practical applications
    - Real-world scenarios
    - Deeper explanations
    
    The final content must be substantial enough to fill the full ${this.TARGET_DURATION} minutes when spoken at a natural pace.`;

    const response = await this.makeRequest(text, systemPrompt);
    let generatedText = response.choices[0].message.content;
    let wordCount = generatedText.split(/\s+/).filter(Boolean).length;

    // If content is too short, request expansion
    if (wordCount < this.MIN_WORDS) {
      const expansionPrompt = `The current content is too short (${wordCount} words). Please expand it to exactly ${this.TARGET_WORDS} words by:
      1. Adding more detailed examples
      2. Providing deeper explanations
      3. Including more practical applications
      4. Adding relevant case studies
      5. Expanding on each main point
      
      Current content:
      ${generatedText}`;

      const expandedResponse = await this.makeRequest(expansionPrompt, systemPrompt);
      generatedText = expandedResponse.choices[0].message.content;
      wordCount = generatedText.split(/\s+/).filter(Boolean).length;
    }

    // Split into chunks
    const chunks = this.splitIntoChunks(generatedText);

    return {
      fullText: generatedText,
      chunks,
      estimatedDuration: Math.round((wordCount / this.WORDS_PER_MINUTE) * 1000) / 1000,
    };
  }

  private static splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split into sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length > this.CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          // If a single sentence is too long, split it at natural pauses
          const naturalBreaks = sentence.match(/[^,;]+[,;]+/g) || [sentence];
          let tempChunk = '';
          
          for (const segment of naturalBreaks) {
            const potentialTempChunk = tempChunk + (tempChunk ? ' ' : '') + segment;
            
            if (potentialTempChunk.length > this.CHUNK_SIZE) {
              if (tempChunk) {
                chunks.push(tempChunk.trim());
                tempChunk = segment;
              } else {
                // If even a segment is too long, split at words
                const words = segment.split(' ');
                let wordChunk = '';
                
                for (const word of words) {
                  const potentialWordChunk = wordChunk + (wordChunk ? ' ' : '') + word;
                  
                  if (potentialWordChunk.length > this.CHUNK_SIZE) {
                    if (wordChunk) {
                      chunks.push(wordChunk.trim());
                      wordChunk = word;
                    } else {
                      // Last resort: split the word itself
                      chunks.push(word.substring(0, this.CHUNK_SIZE));
                      wordChunk = word.substring(this.CHUNK_SIZE);
                    }
                  } else {
                    wordChunk = potentialWordChunk;
                  }
                }
                
                if (wordChunk) {
                  tempChunk = wordChunk;
                }
              }
            } else {
              tempChunk = potentialTempChunk;
            }
          }
          
          if (tempChunk) {
            currentChunk = tempChunk;
          }
        }
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  static async validateChunk(chunk: string, audience: string): Promise<string> {
    // First, ensure the chunk is not too large
    if (chunk.length > this.CHUNK_SIZE) {
      const chunks = this.splitIntoChunks(chunk);
      return chunks[0];
    }

    const systemPrompt = `You are an expert editor specializing in natural, conversational content for ${audience}.
    Review and optimize the following text for natural speech delivery.
    
    Requirements:
    - Maintain natural speaking rhythm
    - Ensure clear pronunciation points through punctuation
    - Keep the conversational flow
    - Remove any stage directions or narration markers
    - Preserve the direct, personal connection with the audience
    - Keep the text under ${this.CHUNK_SIZE} characters
    
    Return only the optimized text without any explanations or markers.`;

    const response = await this.makeRequest(chunk, systemPrompt);
    const optimizedText = response.choices[0].message.content.trim();

    // Double-check length and trim if necessary
    if (optimizedText.length > this.CHUNK_SIZE) {
      return this.splitIntoChunks(optimizedText)[0];
    }

    return optimizedText;
  }

  static estimateChunkDuration(chunk: string): number {
    const words = chunk.split(/\s+/).filter(Boolean);
    const minutes = words.length / this.WORDS_PER_MINUTE;
    return Math.round(minutes * 1000) / 1000;
  }
}
