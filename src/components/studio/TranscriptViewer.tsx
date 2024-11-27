import { useState } from 'react';
import { Play, Pause, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';

interface Chunk {
  text: string;
  audioUrl?: string;
  status: 'pending' | 'processing' | 'completed';
}

interface TranscriptViewerProps {
  chunks: Chunk[];
  currentChunkIndex: number;
  onChunkSelect: (index: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  duration: number;
}

export function TranscriptViewer({
  chunks,
  currentChunkIndex,
  onChunkSelect,
  isPlaying,
  onPlayPause,
  duration
}: TranscriptViewerProps) {
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());

  const toggleChunkExpansion = (index: number) => {
    const newExpandedChunks = new Set(expandedChunks);
    if (expandedChunks.has(index)) {
      newExpandedChunks.delete(index);
    } else {
      newExpandedChunks.add(index);
    }
    setExpandedChunks(newExpandedChunks);
  };

  const getChunkStatusColor = (status: Chunk['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 border-green-500/40';
      case 'processing':
        return 'bg-yellow-500/20 border-yellow-500/40';
      default:
        return 'bg-white/5 border-white/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white/80">
          Transcript ({chunks.length} chunks)
        </h3>
        <div className="flex items-center gap-2 text-white/60">
          <Clock className="h-4 w-4" />
          <span>{Math.round(duration)} minutes</span>
        </div>
      </div>

      {/* Chunks */}
      <div className="space-y-2">
        {chunks.map((chunk, index) => {
          const isExpanded = expandedChunks.has(index);
          const isActive = index === currentChunkIndex;
          const statusColor = getChunkStatusColor(chunk.status);

          return (
            <div
              key={index}
              className={`p-3 rounded-lg border transition-colors duration-300 ${statusColor} ${
                isActive ? 'ring-2 ring-primary/50' : ''
              }`}
            >
              {/* Chunk header */}
              <div className="flex justify-between items-center mb-2">
                <div className="text-white/60 text-sm">Chunk {index + 1}</div>
                <div className="flex items-center gap-2">
                  {chunk.audioUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:text-white/80"
                      onClick={() => {
                        onChunkSelect(index);
                        onPlayPause();
                      }}
                    >
                      {isActive && isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white/80"
                    onClick={() => toggleChunkExpansion(index)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Chunk content */}
              <div
                className={`text-white/80 transition-all duration-300 overflow-hidden ${
                  isExpanded ? 'max-h-[1000px]' : 'max-h-[3em]'
                }`}
              >
                {chunk.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
