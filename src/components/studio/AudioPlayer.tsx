import { useState, useRef, useEffect } from 'react';
import { Button } from "../ui/button";
import { Play, Pause, FileText, Download, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
  title?: string;
  audioUrl?: string;
  isGenerating?: boolean;
  generationProgress?: number;
  onRegenerateClick?: (text: string) => Promise<void>;
  transcript?: string;
}

export function AudioPlayer({
  title = 'Generated audio title',
  audioUrl,
  isGenerating = false,
  generationProgress = 0,
  onRegenerateClick,
  transcript: initialTranscript = ''
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(true); // Show transcript by default
  const [transcript, setTranscript] = useState(initialTranscript);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Update transcript state when prop changes
  useEffect(() => {
    if (initialTranscript) {
      setTranscript(initialTranscript);
      setShowTranscript(true); // Show transcript when it becomes available
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

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <span className="text-lg text-white/80">{title}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`text-white/60 hover:bg-white/10 transition-colors duration-300 ${showTranscript ? 'bg-white/10' : ''}`}
            onClick={() => setShowTranscript(!showTranscript)}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:bg-white/10 transition-colors duration-300"
            onClick={() => {
              if (audioUrl) {
                const link = document.createElement('a');
                link.href = audioUrl;
                link.download = `${title}.mp3`;
                link.click();
              }
            }}
            disabled={!audioUrl || isGenerating}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Always show transcript if available */}
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

      {isGenerating ? (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-white/60">Generating audio...</span>
            </div>
            <span className="text-white/60">{Math.round(generationProgress)}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} />
          )}

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
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm text-white/60">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
