import { Star, Volume2 } from 'lucide-react';
import type { Voice } from '../../lib/playht';

export interface VoiceLibraryProps {
  onVoiceSelect: (voice: Voice) => void;
  onFavoriteToggle?: (voice: Voice) => void;
  onPlaySample?: (voice: Voice) => void;
  voices?: Voice[];
  favoriteVoices?: Set<string>;
}

export function VoiceLibrary({ 
  onVoiceSelect,
  onFavoriteToggle,
  onPlaySample,
  voices = [], // Provide empty array as default
  favoriteVoices = new Set() // Provide empty Set as default
}: VoiceLibraryProps) {
  // Filter voices to only show favorites
  const favoriteVoicesList = voices.filter(voice => favoriteVoices.has(voice.id));

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
      <h2 className="text-xl font-medium text-white/80 mb-4">My Favorite Voices</h2>
      
      {favoriteVoicesList.length === 0 ? (
        <div className="text-white/60 text-center py-4">
          No favorite voices yet. Search and add voices to your favorite.
        </div>
      ) : (
        <div className="space-y-2">
          {favoriteVoicesList.map((voice) => (
            <div
              key={voice.id}
              onClick={() => onVoiceSelect(voice)}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2 hover:bg-white/10 transition-colors duration-300 cursor-pointer items-center rounded-lg"
            >
              <div className="text-white/80">{voice.name}</div>
              <div className="text-white/60">{voice.gender || 'unknown'}</div>
              <div className="text-white/60">{voice.style || 'normal'}</div>
              <div className="text-white/60">{voice.tempo || 'neutral'}</div>
              {onFavoriteToggle && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavoriteToggle(voice);
                  }}
                  className="p-1 text-white/40 hover:text-white/90 transition-colors"
                  title="Remove from favorites"
                >
                  <Star className="h-4 w-4 fill-current text-yellow-400" />
                </button>
              )}
              {onPlaySample && voice.sample && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaySample(voice);
                  }}
                  className="p-1 text-white/40 hover:text-white/90 transition-colors"
                  title="Play sample"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
