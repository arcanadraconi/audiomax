import { AudioProcessingService, AudioProcessingOptions } from '../services/audioProcessingService';

async function processTextToAudio() {
  // Initialize the service with custom options
  const service = new AudioProcessingService({
    maxWordsPerChunk: 100,    // Process text in chunks of 100 words
    maxConcurrentJobs: 3      // Generate 3 audio chunks simultaneously
  });

  // Sample text to process
  const text = `
    This is a demonstration of the AudioMax parallel processing system.
    It will split this text into optimal chunks, generate audio for each chunk in parallel,
    and then combine them into a single, seamless audio file.
    The system handles various aspects of audio processing including:
    - Intelligent text segmentation
    - Parallel audio generation
    - Volume normalization
    - High-quality audio assembly
  `;

  try {
    // Validate text before processing
    if (!service.validateText(text)) {
      throw new Error('Text validation failed. Please check the input text.');
    }

    // Estimate processing time
    const estimatedTime = service.estimateProcessingTime(text);
    console.log(`Estimated processing time: ${estimatedTime / 1000} seconds`);

    // Process options
    const options: AudioProcessingOptions = {
      voice: 'en-US-Neural2-F',  // Example voice ID
      quality: 'premium',
      speed: 1.0,
      onProgress: (progress) => {
        console.log(
          `Phase: ${progress.phase}, ` +
          `Progress: ${progress.progress.toFixed(1)}%, ` +
          `Phase ${progress.phase} of ${progress.totalPhases}`
        );

        if (progress.currentChunk) {
          console.log(`Processing chunk ${progress.currentChunk.index}`);
        }
      }
    };

    // Process text and get audio blob
    console.log('Starting audio processing...');
    const audioBlob = await service.processText(text, options);
    console.log(`Audio processing complete. Generated ${audioBlob.size} bytes`);

    // Example: Save to file
    const fileName = 'demo-output';
    await service.processTextAndSave(text, fileName, options);
    console.log(`Audio saved as ${fileName}.mp3`);

  } catch (error) {
    console.error('Error processing audio:', error);
  } finally {
    // Clean up resources
    service.destroy();
  }
}

// Run the example
processTextToAudio().catch(console.error);
