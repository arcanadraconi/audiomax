import { useState, useRef, useEffect } from 'react';
import { Button } from "../ui/button";
import { Play, Pause, FileText, Download, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
  title?: string;
  audioUrl?: string;
  isGenerating?: boolean;
  generationProgress?: number;
  generationPhase?: 'context_adjustment' | 'generating_audio' | 'complete';
  onRegenerateClick?: (text: string) => Promise<void>;
  transcript?: string;
}

export function AudioPlayer({
  title = 'Generated Audio',
  audioUrl,
  isGenerating = false,
  generationProgress = 0,
  generationPhase = 'complete',
  onRegenerateClick,
  transcript: initialTranscript = ''
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(true); // Default to showing transcript
  const [transcript, setTranscript] = useState(initialTranscript);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Update transcript state when prop changes
  useEffect(() => {
    if (initialTranscript) {
      setTranscript(initialTranscript);
      setShowTranscript(true); // Show transcript when it's updated
    }
  }, [initialTranscript]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', updateProgress);
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateProgress);
      }
    };
  }, [audioUrl]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateProgress = () => {
    if (audioRef.current) {
      const value = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(value);
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * audioRef.current.duration;
  };

  const handleRegenerateClick = () => {
    if (onRegenerateClick && transcript) {
      onRegenerateClick(transcript);
      setShowTranscript(false);
    }
  };

  // Format title for display
  const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
      {/* Title and Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 mr-4">
          <h3 className="text-lg text-white/80 truncate">{displayTitle}</h3>
          {duration > 0 && (
            <p className="text-sm text-white/60 mt-1">
              Duration: {formatTime(duration)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {transcript && (
            <Button
              variant="ghost"
              size="icon"
              className={`text-white/60 hover:bg-white/10 transition-colors duration-300 ${showTranscript ? 'bg-white/10' : ''}`}
              onClick={() => setShowTranscript(!showTranscript)}
              title="Show/Hide Transcript"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
          {audioUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:bg-white/10 transition-colors duration-300"
              onClick={() => {
                const link = document.createElement('a');
                link.href = audioUrl;
                link.download = `${title}.mp3`;
                link.click();
              }}
              title="Download Audio"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Generation Status */}
      {isGenerating && (
        <div className="mb-4">
          {generationPhase === 'context_adjustment' ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-white/70 animate-spin" />
              <span className="text-white/70">Context adjustment...</span>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 text-white/70 animate-spin" />
                  <span className="text-white/70">Generating audio...</span>
                </div>
                <span className="text-white/70">{Math.round(generationProgress)}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/70 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      {transcript && showTranscript && (
        <div className="mb-4">
          <div className="w-full h-32 bg-white/5 border border-white/20 rounded-md p-2 text-white/80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
            {transcript}
          </div>
          {onRegenerateClick && (
            <Button
              className="mt-2 bg-[#4c0562] hover:bg-[#4c0562]/80 text-md font-normal text-white/70"
              onClick={handleRegenerateClick}
              disabled={!transcript}
            >
              Save & Regenerate
            </Button>
          )}
        </div>
      )}

      {/* Audio Controls */}
      <div className="flex flex-col gap-2">
        <div
          ref={progressBarRef}
          className="h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:bg-white/10 transition-colors duration-300"
              onClick={handlePlayPause}
              disabled={!audioUrl}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="text-sm text-white/60">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}
    </div>
  );
}
