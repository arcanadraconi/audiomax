import { useState, useEffect } from 'react';
import { TranscriptProcessor } from '../../lib/services/transcriptProcessor';
import { ParallelAudioGenerator } from '../../lib/services/parallelAudioGenerator';
import { AudioAssembler } from '../../lib/services/audioAssembler';
import { Button } from '../ui/button';
import { AudioPlayer } from './AudioPlayer';

// Voice ID for generation (Play3.0-mini compatible)
const VOICE_ID = 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json';

type ProcessingState = 'idle' | 'transcribing' | 'generating' | 'complete';

export function AudioProcessingDemo() {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const processText = async (text: string) => {
    try {
      // Reset states
      setProcessingState('transcribing');
      setProgress(0);
      setError(null);
      setAudioUrl(null);
      setChunks([]);

      // Store the transcript
      setCurrentTranscript(text);

      // Step 1: Process text into chunks
      console.log('Starting text processing...');
      const processedChunks = TranscriptProcessor.processText(text);
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
      console.log('Initializing parallel generator...');
      const generator = new ParallelAudioGenerator(
        2, // Use 2 workers for parallel processing
        (progress) => {
          setProcessingState('generating');
          setProgress(progress.overall);
          console.log(`Generation progress: ${progress.overall.toFixed(2)}%`);
          progress.chunks.forEach(chunk => {
            console.log(`- Chunk ${chunk.chunkIndex + 1}: ${chunk.progress.toFixed(2)}% (${chunk.status})`);
          });
        }
      );

      // Step 3: Generate audio
      console.log('Starting audio generation with voice:', VOICE_ID);
      const generatedUrls = await generator.generateParallel(processedChunks, VOICE_ID);
      console.log('Generated audio URLs:', generatedUrls);

      // Step 4: If multiple chunks, combine them
      if (generatedUrls.length > 1) {
        console.log('Combining audio chunks...');
        const assembler = new AudioAssembler((progress) => {
          setProgress(progress.progress);
          console.log(`Assembly progress: ${progress.phase} - ${progress.progress.toFixed(2)}%`);
        });

        // Create array of audio blobs
        const audioBlobs = await Promise.all(
          generatedUrls.map(async url => {
            const response = await fetch(url);
            return response.blob();
          })
        );

        const combinedBlob = await assembler.combineAudioUrls(generatedUrls);
        const finalUrl = URL.createObjectURL(combinedBlob);
        setAudioUrl(finalUrl);
        console.log('Audio chunks combined successfully');
      } else {
        setAudioUrl(generatedUrls[0]);
        console.log('Single audio file generated, no combining needed');
      }

      setProcessingState('complete');
      console.log('Audio processing complete');

    } catch (err) {
      console.error('Error in audio processing:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProcessingState('idle');
    }
  };

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <AudioPlayer
          title="Generated Audio"
          audioUrl={audioUrl || undefined}
          isGenerating={processingState === 'transcribing' || processingState === 'generating'}
          generationProgress={progress}
          onRegenerateClick={processText}
          transcript={currentTranscript}  // Pass the current transcript
        />
      </div>
    </div>
  );
}
