import { useState } from 'react';

export interface Voice {
  id: string;
  name: string;
  sample: string;
  accent: string;
  age: string;
  gender: string;
  language: string;
  language_code: string;
  loudness: string;
  style: string;
  tempo: string;
  texture: string;
  is_cloned: boolean;
  voice_engine: string;
}

export interface VoiceLibraryProps {
  onVoiceSelect: (voice: Voice) => void;
}

export function VoiceLibrary({ onVoiceSelect }: VoiceLibraryProps) {
  // This would typically be loaded from user's saved favorites in the database
  const [favoriteVoices] = useState<Voice[]>([]);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
      <h2 className="text-xl font-medium text-white/80 mb-4">My Favorite Voices</h2>
      
      {favoriteVoices.length === 0 ? (
        <div className="text-white/60 text-center py-4">
          No favorite voices yet. Search and add voices to your favorite.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoriteVoices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => onVoiceSelect(voice)}
              className="flex flex-col p-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20 text-left"
            >
              <span className="text-lg font-medium text-white/90">{voice.name}</span>
              <span className="text-sm text-white/60">{voice.accent} • {voice.gender}</span>
              <span className="text-sm text-white/60">{voice.language}</span>
              {voice.is_cloned && (
                <span className="mt-2 px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full self-start">
                  Cloned Voice
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
