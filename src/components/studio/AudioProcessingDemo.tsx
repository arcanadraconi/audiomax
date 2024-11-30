import { useState, useEffect } from 'react';
import { TranscriptProcessor } from '../../lib/services/transcriptProcessor';
import { ParallelAudioGenerator } from '../../lib/services/parallelAudioGenerator';
import { AudioAssembler } from '../../lib/services/audioAssembler';
import { Button } from '../ui/button';
import { env } from '../../env';

// Longer test text to verify parallel processing (repeated 4 times to ensure multiple chunks)
const testText = `Ever felt like you're being sized up, not for who you are, but for where you're from? Like the subtle lilt in your voice, the way you roll your Rs, instantly boxes you in? That's the frustrating reality for many people from "poor" countries – the immediate assumption that they're somehow less than, less deserving, less capable. It's a prejudice as old as time, as insidious as a whisper, and it's high time we called it out. We're talking about the audacity of dreams, the gall of ambition when you dare to aspire beyond the limitations others impose on you based on your origin.

Moreover, this isn't just about individual prejudice; it's woven into the fabric of our societies. Look at the way resources are distributed, the way opportunities are allocated, the way narratives are shaped. Who gets the benefit of the doubt? Who gets access to education, healthcare, and a fair shot at success? More often than not, it's those who already hold power, those who fit the dominant mold. And for those who don't, the climb is steeper, the hurdles higher, the judgment harsher.

Furthermore, consider the psychological impact of constant prejudice. The way it seeps into self-perception, the way it shapes aspirations and dreams. How many brilliant minds have we lost to the crushing weight of lowered expectations? How many innovations have never seen the light of day because someone was told they didn't belong in that space? The cost to human potential is immeasurable.

Therefore, it's crucial to recognize that this isn't just about being "nice" or "politically correct." It's about unlocking human potential. It's about creating a world where merit truly matters more than accent, where capability trumps origin, where dreams aren't confined by postal codes. The global challenges we face require all hands on deck, all minds engaged, all perspectives considered.

In conclusion, the time has come to challenge these deeply ingrained prejudices. To question our assumptions, to examine our biases, to create spaces where everyone's voice carries equal weight. Because in the end, talent doesn't have an accent, brilliance doesn't have a passport, and innovation doesn't care where you were born. The only question that should matter is: What can you bring to the table?`;

// Test voice ID (Play3.0-mini compatible)
const TEST_VOICE_ID = 'nova';

export function AudioProcessingDemo() {
  const [chunks, setChunks] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [workerProgress, setWorkerProgress] = useState<{[key: number]: number}>({});
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);

  const processText = async () => {
    try {
      setProcessing(true);
      setError(null);
      setPhase('Processing text...');
      console.log('Starting text processing...');

      // Step 1: Process text into chunks
      const processedChunks = TranscriptProcessor.processText(testText);
      setChunks(processedChunks);
      
      // Log chunk information
      console.log(`Split into ${processedChunks.length} chunks:`);
      processedChunks.forEach((chunk, i) => {
        console.log(`\nChunk ${i + 1}:`);
        console.log(`- Length: ${chunk.text.length} characters`);
        console.log(`- Word count: ${chunk.metadata.wordCount}`);
        console.log(`- Estimated duration: ${chunk.metadata.estimatedDuration.toFixed(2)} minutes`);
        console.log(`- Preview: "${chunk.text.substring(0, 100)}..."`);
      });

      // Step 2: Initialize parallel generator
      setPhase('Setting up parallel generation...');
      console.log('Initializing parallel generator...');
      const generator = new ParallelAudioGenerator(
        2, // Use 2 workers for parallel processing
        (progress) => {
          setProgress(progress.overall);
          // Update individual worker progress
          const newWorkerProgress: {[key: number]: number} = {};
          progress.chunks.forEach(chunk => {
            newWorkerProgress[chunk.chunkIndex] = chunk.progress;
            console.log(`Worker ${chunk.chunkIndex + 1}: ${chunk.progress.toFixed(2)}% (${chunk.status})`);
          });
          setWorkerProgress(newWorkerProgress);
          console.log(`Overall progress: ${progress.overall.toFixed(2)}%`);
        }
      );

      // Step 3: Generate audio for chunks
      setPhase('Generating audio...');
      console.log('Starting audio generation with voice:', TEST_VOICE_ID);
      const generatedUrls = await generator.generateParallel(processedChunks, TEST_VOICE_ID);
      console.log('Generated audio URLs:', generatedUrls);
      setAudioUrls(generatedUrls);

      // Step 4: Initialize audio assembler
      if (generatedUrls.length > 1) {
        setPhase('Setting up audio assembly...');
        console.log('Initializing audio assembler...');
        const assembler = new AudioAssembler((progress) => {
          setPhase(`${progress.phase} - ${progress.progress.toFixed(2)}%`);
          console.log(`Assembly progress: ${progress.phase} - ${progress.progress.toFixed(2)}%`);
        });

        // Step 5: Combine audio chunks
        setPhase('Combining audio chunks...');
        console.log('Combining audio chunks...');
        const combinedBlob = await assembler.combineAudioUrls(generatedUrls);
        const finalUrl = URL.createObjectURL(combinedBlob);
        setFinalAudioUrl(finalUrl);
        console.log('Audio chunks combined successfully');
      } else {
        setFinalAudioUrl(generatedUrls[0]);
        console.log('Single audio file generated, no combining needed');
      }

      setProcessing(false);
      setPhase('Processing complete');
      console.log('Audio processing complete');

    } catch (err) {
      console.error('Error in audio processing:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProcessing(false);
    }
  };

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      audioUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      if (finalAudioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(finalAudioUrl);
      }
    };
  }, [audioUrls, finalAudioUrl]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Audio Processing Demo</h2>
      
      <Button
        onClick={processText}
        disabled={processing}
        className="w-full"
      >
        {processing ? 'Processing...' : 'Start Processing'}
      </Button>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {processing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{phase}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {chunks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Processed Chunks ({chunks.length})</h3>
          {chunks.map((chunk, index) => (
            <div key={index} className="p-4 bg-gray-100 rounded space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Chunk {index + 1}</span>
                <span>{chunk.metadata.wordCount} words</span>
              </div>
              <div className="text-sm">
                {chunk.text.substring(0, 150)}...
              </div>
              <div className="text-xs text-gray-500">
                Estimated duration: {chunk.metadata.estimatedDuration.toFixed(2)} minutes
              </div>
              {workerProgress[index] !== undefined && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Worker Progress</span>
                    <span>{Math.round(workerProgress[index])}%</span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full mt-1">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${workerProgress[index]}%` }}
                    />
                  </div>
                </div>
              )}
              {audioUrls[index] && (
                <div className="mt-2">
                  <audio controls src={audioUrls[index]} className="w-full" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {finalAudioUrl && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-medium mb-2">Final Combined Audio</h3>
          <audio controls src={finalAudioUrl} className="w-full" />
        </div>
      )}
    </div>
  );
}
