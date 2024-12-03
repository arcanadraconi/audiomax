import { TranscriptProcessor } from '../services/transcriptProcessor';
import { ParallelAudioGenerator } from '../services/parallelAudioGenerator';
import { AudioAssembler } from '../services/audioAssembler';

// Example voice ID for generation (Play3.0-mini compatible)
const VOICE_ID = 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json';

interface ProcessingResult {
  audioUrl: string;
  transcript: string;
  duration: number;
}

export async function processContent(text: string): Promise<ProcessingResult> {
  try {
    // Step 1: Process text into chunks
    console.log('Starting text processing...');
    const processedChunks = TranscriptProcessor.processText(text);
    
    // Log chunk information
    console.log(`Split into ${processedChunks.length} chunks:`);
    processedChunks.forEach((chunk, i) => {
      console.log(`\nChunk ${i + 1}:`);
      console.log(`- Length: ${chunk.text.length} characters`);
      console.log(`- Word count: ${chunk.metadata.wordCount}`);
      console.log(`- Estimated duration: ${chunk.metadata.estimatedDuration.toFixed(2)} minutes`);
      console.log(`- Preview: "${chunk.text.substring(0, 100)}..."`);
    });

    // Step 2: Generate audio for all chunks in parallel
    console.log('Starting parallel audio generation...');
    const generatedUrls = await new ParallelAudioGenerator(
      2, // Use 2 workers for parallel processing
      (progress) => {
        console.log(`Generation progress: ${progress.overall.toFixed(2)}%`);
        progress.chunks.forEach(chunk => {
          console.log(`- Chunk ${chunk.chunkIndex + 1}: ${chunk.progress.toFixed(2)}% (${chunk.status})`);
        });
      }
    ).generateParallel(processedChunks, VOICE_ID);

    console.log('Generated audio URLs:', generatedUrls);

    // Step 3: If multiple chunks, combine them
    let finalUrl: string;
    if (generatedUrls.length > 1) {
      console.log('Combining audio chunks...');
      const combinedBlob = await new AudioAssembler((progress) => {
        console.log(`Assembly progress: ${progress.phase} - ${progress.progress.toFixed(2)}%`);
      }).combineAudioUrls(generatedUrls);
      finalUrl = URL.createObjectURL(combinedBlob);
      console.log('Audio chunks combined successfully');
    } else {
      finalUrl = generatedUrls[0];
      console.log('Single audio file generated, no combining needed');
    }

    // Calculate total duration
    const totalDuration = processedChunks.reduce(
      (sum, chunk) => sum + chunk.metadata.estimatedDuration,
      0
    );

    return {
      audioUrl: finalUrl,
      transcript: text,
      duration: totalDuration
    };

  } catch (error) {
    console.error('Error in audio processing:', error);
    throw error;
  }
}
