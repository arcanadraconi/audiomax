import { TranscriptProcessor } from '../services/transcriptProcessor';
import { ParallelAudioGenerator } from '../services/parallelAudioGenerator';
import { AudioAssembler } from '../services/audioAssembler';

const testText = `this is a test`; // Your full text here

async function testAudioProcessing() {
  try {
    console.log('Starting audio processing test...');

    // Step 1: Process text into chunks
    console.log('\n=== Text Processing ===');
    const chunks = TranscriptProcessor.processText(testText);
    console.log(`Split into ${chunks.length} chunks:`);
    chunks.forEach((chunk, i) => {
      console.log(`\nChunk ${i + 1}:`);
      console.log(`- Length: ${chunk.text.length} characters`);
      console.log(`- Word count: ${chunk.metadata.wordCount}`);
      console.log(`- Estimated duration: ${chunk.metadata.estimatedDuration.toFixed(2)} minutes`);
      console.log(`- Preview: "${chunk.text.substring(0, 100)}..."`);
    });

    // Step 2: Initialize parallel generator
    console.log('\n=== Parallel Generation Setup ===');
    const generator = new ParallelAudioGenerator(
      3, // Max concurrent generations
      (progress) => {
        console.log(`Generation progress: ${progress.overall.toFixed(2)}%`);
        progress.chunks.forEach(chunk => {
          console.log(`- Chunk ${chunk.chunkIndex + 1}: ${chunk.progress.toFixed(2)}% (${chunk.status})`);
        });
      }
    );

    // Step 3: Initialize audio assembler
    console.log('\n=== Audio Assembly Setup ===');
    const assembler = new AudioAssembler((progress) => {
      console.log(`Assembly progress: ${progress.phase} - ${progress.progress.toFixed(2)}%`);
    });

    // Log total estimated processing time
    const totalDuration = TranscriptProcessor.getEstimatedTotalDuration(chunks);
    const totalWords = TranscriptProcessor.getTotalWordCount(chunks);
    console.log('\n=== Processing Estimates ===');
    console.log(`Total word count: ${totalWords}`);
    console.log(`Estimated total duration: ${totalDuration.toFixed(2)} minutes`);
    console.log(`Number of parallel workers: 3`);
    console.log(`Estimated processing time: ${(totalDuration / 3).toFixed(2)} minutes`);

    return {
      chunks,
      totalWords,
      totalDuration,
      estimatedProcessingTime: totalDuration / 3
    };

  } catch (error) {
    console.error('Error in audio processing test:', error);
    throw error;
  }
}

// Run the test
testAudioProcessing().then(result => {
  console.log('\n=== Test Complete ===');
  console.log('Results:', result);
}).catch(error => {
  console.error('Test failed:', error);
});
