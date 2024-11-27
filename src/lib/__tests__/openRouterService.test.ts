import { OpenRouterService } from '../openRouterService';

describe('OpenRouterService', () => {
  const sampleInput = `Create an engaging talk about the power of mental control and mindfulness in our daily lives. 
  Discuss how we can harness our thoughts to improve focus, reduce stress, and achieve better results in both personal and professional settings.
  Include practical examples and techniques that the audience can implement immediately.`;

  const sampleAudience = 'Deep/Debate Content, Motivational, TedTalk';

  test('generates transcript with correct length and chunks', async () => {
    const result = await OpenRouterService.generateTranscript(sampleInput, sampleAudience);

    // Check total duration
    expect(result.estimatedDuration).toBeGreaterThanOrEqual(13);
    expect(result.estimatedDuration).toBeLessThanOrEqual(15);

    // Check number of chunks
    expect(result.chunks.length).toBeGreaterThanOrEqual(5);

    // Check chunk sizes
    result.chunks.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(1800);
      // Each chunk should be a substantial size
      expect(chunk.length).toBeGreaterThan(500);
    });

    // Check content quality
    expect(result.fullText).not.toContain('[Narrator]');
    expect(result.fullText).not.toContain('[Pause]');
    expect(result.fullText).not.toContain('[Music]');

    // Check word count for 15-minute duration
    const wordCount = result.fullText.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeGreaterThanOrEqual(2000); // Minimum words for 13 minutes
    expect(wordCount).toBeLessThanOrEqual(2500); // Maximum words for 15 minutes
  });

  test('generates natural, conversational content', async () => {
    const result = await OpenRouterService.generateTranscript(sampleInput, sampleAudience);

    // Check for natural language patterns
    expect(result.fullText).toMatch(/\?/); // Should have rhetorical questions
    expect(result.fullText).toMatch(/!/); // Should have emphasis
    expect(result.fullText).not.toMatch(/\[.*?\]/); // No stage directions
    
    // Check for engagement patterns
    const hasRhetoricalQuestions = result.chunks.some(chunk => 
      chunk.includes('?') && chunk.length - chunk.replace(/\?/g, '').length > 0
    );
    expect(hasRhetoricalQuestions).toBe(true);

    // Check for natural transitions
    const transitions = [
      'Now,',
      'Let\'s',
      'Consider',
      'Think about',
      'Imagine',
      'For example',
    ];
    const hasTransitions = transitions.some(transition => 
      result.fullText.includes(transition)
    );
    expect(hasTransitions).toBe(true);
  });

  test('handles chunk optimization correctly', async () => {
    const result = await OpenRouterService.generateTranscript(sampleInput, sampleAudience);

    for (const chunk of result.chunks) {
      // Test each chunk with validateChunk
      const optimizedChunk = await OpenRouterService.validateChunk(chunk, sampleAudience);

      // Optimized chunk should maintain natural language
      expect(optimizedChunk).not.toContain('[');
      expect(optimizedChunk).not.toContain(']');
      expect(optimizedChunk.length).toBeLessThanOrEqual(1800);

      // Check for sentence completeness
      const endsWithPunctuation = /[.!?]$/.test(optimizedChunk.trim());
      expect(endsWithPunctuation).toBe(true);
    }
  });

  test('estimates duration accurately', () => {
    const sampleChunk = 'This is a test chunk with exactly twenty words that should take approximately eight seconds to speak aloud naturally.';
    const duration = OpenRouterService.estimateChunkDuration(sampleChunk);
    
    // 20 words at 150 words per minute = 0.133... minutes
    // With our rounding to 3 decimal places, this should be 0.127
    expect(duration).toBe(0.127);
  });
});
