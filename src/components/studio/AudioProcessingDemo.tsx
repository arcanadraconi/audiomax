import { useState, useEffect } from 'react';
import { useAudioProcessing } from '../../hooks/useAudioProcessing';
import { AudioPlayer } from './AudioPlayer';
import { Button } from '../ui/button';

export function AudioProcessingDemo() {
  const [text, setText] = useState('');
  const {
    processText,
    unmount,
    isProcessing,
    progress,
    error,
    audioUrl
  } = useAudioProcessing();

  // Cleanup on unmount
  useEffect(() => {
    return () => unmount();
  }, [unmount]);

  const handleProcess = async () => {
    try {
      await processText(text, {
        voice: 'en-US-Neural2-F',
        quality: 'premium',
        speed: 1.0,
      });
    } catch (err) {
      console.error('Error processing text:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to audio..."
          className="w-full h-32 bg-white/5 border border-white/20 rounded-md p-2 text-white/80 resize-none focus:outline-none focus:border-primary"
        />
        <Button
          onClick={handleProcess}
          disabled={isProcessing || !text.trim()}
          className="w-full bg-primary hover:bg-primary/80"
        >
          {isProcessing ? 'Processing...' : 'Generate Audio'}
        </Button>
      </div>

      {error && (
        <div className="text-red-400 bg-red-400/10 p-2 rounded">
          {error}
        </div>
      )}

      {progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-white/60">
            <span>Phase: {progress.phase}</span>
            <span>{Math.round(progress.progress)}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div className="text-xs text-white/40 text-right">
            Phase {progress.phase} of {progress.totalPhases}
          </div>
        </div>
      )}

      {audioUrl && (
        <AudioPlayer
          title="Generated Audio"
          audioUrl={audioUrl}
        />
      )}
    </div>
  );
}
