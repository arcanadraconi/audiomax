import { useState, useEffect, useRef } from 'react';
import { Search, Star, Volume2 } from 'lucide-react';
import type { Voice } from '../../lib/playht';

interface VoiceSearchProps {
  onVoiceSelect: (voice: Voice) => void;
  onFavoriteToggle?: (voice: Voice) => void;
  onPlaySample?: (voice: Voice) => void;
  isLibraryMode?: boolean;
  favoriteVoices?: Set<string>;
  voices?: Voice[];
}

interface VoiceGroup {
  language: string;
  voices: Voice[];
}

export function VoiceSearch({
  onVoiceSelect,
  onFavoriteToggle,
  onPlaySample,
  isLibraryMode = true,
  favoriteVoices = new Set(),
  voices: initialVoices = []
}: VoiceSearchProps) {
  const [voices, setVoices] = useState<Voice[]>(initialVoices);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>(initialVoices);
  const [voiceGroups, setVoiceGroups] = useState<VoiceGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoices(initialVoices);
    setFilteredVoices(initialVoices);
    const groups = groupVoicesByLanguage(initialVoices);
    setVoiceGroups(groups);
  }, [initialVoices]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groupVoicesByLanguage = (voices: Voice[]): VoiceGroup[] => {
    const groups: { [key: string]: Voice[] } = {};

    voices.forEach(voice => {
      const lang = voice.language || 'Unknown';
      if (!groups[lang]) {
        groups[lang] = [];
      }
      groups[lang].push(voice);
    });

    // Sort voices within each group by name
    Object.values(groups).forEach(groupVoices => {
      groupVoices.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Convert to array and sort by language
    return Object.entries(groups)
      .map(([language, voices]) => ({ language, voices }))
      .sort((a, b) => a.language.localeCompare(b.language));
  };

  const searchVoices = (term: string) => {
    setSearchTerm(term);
    setShowDropdown(true);

    if (term.length < 2) {
      setFilteredVoices(voices);
      setVoiceGroups(groupVoicesByLanguage(voices));
      return;
    }

    const searchTerms = term.toLowerCase().split(' ');
    const filtered = voices.filter(voice => {
      return searchTerms.every(term => {
        const searchableFields = [
          voice.name,
          voice.gender,
          voice.accent,
          voice.language
        ].filter(Boolean);

        return searchableFields.some(field =>
          field?.toLowerCase().includes(term)
        );
      });
    });

    setFilteredVoices(filtered);
    setVoiceGroups(groupVoicesByLanguage(filtered));
  };

  const formatLanguage = (language: string) => {
    // Remove country codes and parentheses
    return language.replace(/\([^)]*\)/g, '').replace(/\s*\w{2}$/, '').trim();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 text-white/40" />
        <input
          placeholder={isLibraryMode ? "Search voice library..." : "Search your cloned voices..."}
          value={searchTerm}
          onChange={(e) => searchVoices(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-10 p-1 bg-transparent border border-white/20 rounded-md text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>

      {showDropdown && voiceGroups.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-2">
          <div className="mx-0 bg-[#1a1a4d]/95 backdrop-blur-sm rounded-lg border text-sm border-white/10">
            <div className="max-h-[calc(3*4rem)] overflow-y-auto">
              {voiceGroups.map((group) => (
                <div key={group.language}>
                  <div className="px-4 py-2 bg-white/5 text-white/40 text-xs uppercase tracking-wider">
                    {formatLanguage(group.language)}
                  </div>
                  {group.voices.map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => {
                        onVoiceSelect(voice);
                        setShowDropdown(false);
                        setSearchTerm('');
                      }}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2 hover:bg-white/10 transition-colors duration-300 cursor-pointer items-center"
                    >
                      <div className="text-white/80">{voice.name}</div>
                      <div className="text-white/60">{voice.gender || 'unknown'}</div>
                      <div className="text-white/60">{voice.accent || '-'}</div>
                      <div className="text-white/60">{formatLanguage(voice.language)}</div>
                      {onFavoriteToggle && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFavoriteToggle(voice);
                          }}
                          className="p-1 text-white/40 hover:text-white/90 transition-colors"
                          title={favoriteVoices.has(voice.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star
                            className={`h-4 w-4 ${favoriteVoices.has(voice.id) ? 'fill-current text-yellow-400' : ''}`}
                          />
                        </button>
                      )}
                      {onPlaySample && voice.sample && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Playing sample:', voice.sample);
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
              ))}
            </div>
          </div>
        </div>
      )}

      {searchTerm && filteredVoices.length === 0 && (
        <div className="mt-2 text-white/60">No voices found matching your search.</div>
      )}
    </div>
  );
}
