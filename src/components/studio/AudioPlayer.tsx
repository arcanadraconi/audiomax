import { useState, useRef, useEffect } from 'react';
import { Button } from "../ui/button";
import { Play, Pause, FileText, Download, Loader2, RefreshCw, X } from 'lucide-react';

interface AudioPlayerProps {
  title?: string;
  audioUrl?: string;
  isGenerating?: boolean;
  generationProgress?: number;
  generationPhase?: 'context_building' | 'generating_audio' | 'complete';
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
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(initialTranscript);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update transcript state when prop changes
  useEffect(() => {
    if (initialTranscript) {
      setTranscript(initialTranscript);
      setEditedTranscript(initialTranscript);
    }
  }, [initialTranscript]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', updateProgress);
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateProgress);
        audioRef.current.removeEventListener('ended', () => {
          setIsPlaying(false);
        });
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

  const handleRegenerateClick = async () => {
    if (onRegenerateClick && editedTranscript && editedTranscript !== transcript) {
      try {
        setIsRegenerating(true);
        await onRegenerateClick(editedTranscript);
        setTranscript(editedTranscript);
        setIsEditing(false);
        setShowTranscript(false);
      } catch (error) {
        console.error('Failed to regenerate audio:', error);
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  const handleTranscriptEdit = () => {
    if (!isEditing) {
      setIsEditing(true);
      // Focus textarea after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    } else {
      setIsEditing(false);
      setEditedTranscript(transcript); // Reset to original if cancelled
    }
  };

  // Format title for display
  const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;

  // Get generation phase label
  const getPhaseLabel = () => {
    switch (generationPhase) {
      case 'context_building':
        return 'Building context...';
      case 'generating_audio':
        return 'Generating audio';
      default:
        return displayTitle;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg max-w-full">
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-lg text-white/80 truncate">
          {isGenerating ? getPhaseLabel() : displayTitle}
        </h3>
        {duration > 0 && !isGenerating && (
          <p className="text-sm text-white/60 mt-1">
            Duration: {formatTime(duration)}
          </p>
        )}
      </div>

      {/* Audio Controls with Integrated Progress */}
      <div className="flex flex-col gap-2">
        {/* Progress Bar - Shows either generation progress or playback progress */}
        <div
          ref={progressBarRef}
          className={`h-1 bg-white/10 rounded-full overflow-hidden ${!isGenerating && audioUrl ? 'cursor-pointer' : ''}`}
          onClick={!isGenerating && audioUrl ? handleProgressClick : undefined}
        >
          {isGenerating && generationPhase === 'generating_audio' ? (
            <div
              className="h-full bg-white/70 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            />
          ) : (
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left Side: Play/Pause and Time */}
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                {generationPhase === 'generating_audio' && (
                  <span className="text-sm text-white/60">{Math.round(generationProgress)}%</span>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Right Side: Action Buttons */}
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
      </div>

      {/* Transcript */}
      {transcript && showTranscript && (
        <div className="mt-4 space-y-2">
          {isEditing ? (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                className="w-full h-32 bg-white/5 border border-white/20 rounded-md p-2 text-white/80 resize-none focus:outline-none focus:border-white/40 transition-colors"
                placeholder="Edit transcript..."
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white/40 hover:text-white/60"
                onClick={() => {
                  setIsEditing(false);
                  setEditedTranscript(transcript);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div 
              className="w-full h-32 bg-white/5 border border-white/20 rounded-md p-2 text-white/80 overflow-y-auto cursor-pointer hover:border-white/30 transition-colors"
              onClick={handleTranscriptEdit}
              title="Click to edit"
            >
              {transcript}
            </div>
          )}
          
          {/* Edit/Save Controls */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:bg-white/10"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTranscript(transcript);
                  }}
                >
                  Cancel
                </Button>
                {editedTranscript !== transcript && (
                  <Button
                    className="bg-[#4c0562] hover:bg-[#4c0562]/80 text-white/90"
                    size="sm"
                    onClick={handleRegenerateClick}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Audio
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:bg-white/10"
                onClick={handleTranscriptEdit}
              >
                Edit Transcript
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}
    </div>
  );
}
