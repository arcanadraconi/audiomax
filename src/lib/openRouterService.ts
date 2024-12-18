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
  private static readonly MODEL = 'meta-llama/llama-3.3-70b-instruct';  // Using a faster model 
  private static readonly TARGET_DURATION = 15; // Target full 15 minutes
  private static readonly WORDS_PER_MINUTE = 150; // Average speaking rate
  private static readonly MIN_WORDS = 2500; // Minimum words needed for 15 minutes
  private static readonly MIN_CHUNK_WORDS = 700; // Minimum words per chunk
  private static readonly MAX_CHUNK_WORDS = 1000; // Maximum words per chunk
  private static readonly TARGET_CHUNKS = 9; // Target number of chunks

  private static getApiKey(): string {
    const key = (import.meta.env as any).VITE_OPENROUTER_API_KEY;
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
    const systemPrompt = `You are an expert content creator specializing in ${audience} content with a unique ability to instantly connect with your listeners. Create a captivating ${this.TARGET_DURATION}-minute monologue with EXACTLY 9 sections that feels like an authentic conversation.
CRITICAL LENGTH REQUIREMENTS:

Total content MUST be at least ${this.MIN_WORDS} words
Each section MUST be between ${this.MIN_CHUNK_WORDS} and ${this.MAX_CHUNK_WORDS} words
Each section MUST end with a complete sentence
Each section MUST flow naturally into the next, as if telling a compelling story

Format your response in exactly 9 sections. Mark the start of each section with [SECTION X] (these markers will be removed from the final output).
Writing style and tone:

Open with an authentic, attention-grabbing statement that immediately resonates with ${audience}
Avoid expression such as "let's diving", "imagine if you will", "Hi everyone" or other expression higly suggestive to be an AI. 
You start directly with the topic unless requested otherwise by the user.
Write in a conversational, relatable tone that mirrors how your target audience thinks and speaks
Share relevant personal anecdotes, observations, and cultural references that your audience will recognize
Include thought-provoking perspectives that challenge conventional wisdom
Incorporate humor, wit, and light sarcasm where appropriate
Address common frustrations, desires, and unspoken thoughts your audience experiences
Use casual language, colloquialisms, and current expressions natural to ${audience}
Weave in rhetorical questions that reflect your audience's inner monologue
Create emotional peaks and valleys through varied sentence structure and strategic pauses
Build genuine connections through shared experiences and understanding
Close each section with impactful statements that leave listeners wanting more
Maintain an authentic voice throughout - be bold, honest, and refreshingly real
NO artificial transitions or forced segues
NO obvious formulas or templated phrases
NO meta-commentary or stage directions

Additional guidelines:

Read the room: Adjust energy levels and tone to match your audience's expectations
Show don't tell: Use vivid examples and scenarios instead of abstract concepts
Keep it real: Address potential objections or skepticism naturally
Build trust: Demonstrate genuine expertise while remaining approachable
Stay current: Reference recent trends and developments relevant to ${audience}
Be inclusive: Consider diverse perspectives within your target audience

The final content should feel like an engaging conversation with a knowledgeable friend who truly understands the audience's world.

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
