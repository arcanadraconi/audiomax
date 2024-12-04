import { useState, useEffect, useRef } from 'react';
import { Search, Star, Volume2 } from 'lucide-react';
import { playhtClient } from '../../lib/playht';
import type { Voice } from '../../lib/playht';

interface VoiceSearchProps {
  onVoiceSelect: (voice: Voice) => void;
  onFavoriteToggle?: (voice: Voice) => void;
  onPlaySample?: (voice: Voice) => void;
  isLibraryMode?: boolean;
  favoriteVoices?: Set<string>;
  voices?: Voice[];
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVoices();
  }, [isLibraryMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVoices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching voices...');
      const voiceList = isLibraryMode 
        ? await playhtClient.getVoices()
        : await playhtClient.getClonedVoices();
      
      console.log(`Fetched ${voiceList.length} voices`);

      // Remove duplicates based on voice ID and name
      const uniqueVoices = voiceList.reduce((acc: Voice[], current) => {
        const exists = acc.find(voice => 
          voice.id === current.id || 
          voice.name.toLowerCase() === current.name.toLowerCase()
        );
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Sort voices by name
      const sortedVoices = uniqueVoices.sort((a, b) => a.name.localeCompare(b.name));
      setVoices(sortedVoices);
      setFilteredVoices(sortedVoices);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch voices';
      console.error('Voice fetch error:', errorMessage);
      setError('Unable to load voices. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const searchVoices = (term: string) => {
    setSearchTerm(term);
    setShowDropdown(true);

    if (term.length < 2) {
      setFilteredVoices(voices);
      return;
    }

    const searchTerms = term.toLowerCase().split(' ');
    const filtered = voices.filter(voice => {
      return searchTerms.every(term => {
        const searchableFields = [
          voice.name,
          voice.gender,
          voice.age,
          voice.style,
          voice.accent,
          voice.tempo,
          voice.texture,
          voice.loudness,
          voice.language
        ].filter(Boolean);

        return searchableFields.some(field =>
          field?.toLowerCase().includes(term) ||
          (term === 'podcast' &&
            (voice.style?.toLowerCase().includes('casual') ||
              voice.style?.toLowerCase().includes('conversational')))
        );
      });
    });

    setFilteredVoices(filtered);
  };

  const handleVoiceSelect = (voice: Voice) => {
    console.log('Selected voice:', {
      name: voice.name,
      id: voice.id,
      gender: voice.gender,
      accent: voice.accent
    });
    onVoiceSelect(voice);
    setSearchTerm('');
    setShowDropdown(false);
    setFilteredVoices([]);
  };

  const getVoiceKey = (voice: Voice, index: number) => {
    // Create a unique key by combining multiple voice properties and index
    return `${voice.id}-${voice.name}-${voice.language}-${index}`;
  };

  const formatLanguage = (language: string) => {
    // Remove country codes and parentheses
    return language.replace(/\([^)]*\)/g, '').replace(/\s*\w{2}$/, '').trim();
  };

  const handleRetry = () => {
    fetchVoices();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 z-10 top-1/2 transform -translate-y-1/2 text-white/40" />
        <input
          placeholder={isLibraryMode ? "Search voice library..." : "Search your voices..."}
          value={searchTerm}
          onChange={(e) => searchVoices(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-10 p-1 bg-transparent border border-white/20 rounded-md text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>

      {isLoading && (
        <div className="mt-2 text-white/60">Loading voices...</div>
      )}

      {error && (
        <div className="mt-2 text-red-400">
          {error}
          <button 
            onClick={handleRetry}
            className="ml-2 text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {!isLibraryMode && !isLoading && !error && voices.length === 0 && (
        <div className="mt-2 px-4 py-3 bg-white/5 rounded-lg text-white/60 text-sm">
          No voice clones generated yet. Create your first voice clone to get started.
        </div>
      )}

      {showDropdown && !isLoading && !error && filteredVoices.length > 0 && (
        <div
          className="absolute left-0 right-0 z-50 top-full mt-2"
          style={{ top: '100%', marginTop: '0.5rem' }}
        >
          <div className="mx-0 bg-[#1a1a4d]/95 backdrop-blur-sm rounded-lg border text-sm border-white/10">
            <div className="max-h-[calc(3*4rem)] overflow-y-auto">
              {filteredVoices.map((voice, index) => (
                <div
                  key={getVoiceKey(voice, index)}
                  onClick={() => handleVoiceSelect(voice)}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2 hover:bg-white/10 transition-colors duration-300 cursor-pointer items-center"
                >
                  <div className="text-white/80">{voice.name}</div>
                  <div className="text-white/60">{voice.gender}</div>
                  <div className="text-white/60">{voice.accent}</div>
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
          </div>
        </div>
      )}

      {!isLoading && !error && searchTerm && filteredVoices.length === 0 && (
        <div className="mt-2 text-white/60">No voices found matching your search.</div>
      )}
    </div>
  );
}
