import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { playhtClient } from '../../lib/playht';
import type { Voice } from '../../lib/playht';

interface VoiceSearchProps {
  isLibraryMode: boolean;
  onVoiceSelect: (voice: Voice) => void;
}

export function VoiceSearch({ isLibraryMode, onVoiceSelect }: VoiceSearchProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLibraryMode) {
      fetchVoiceLibrary();
    } else {
      fetchClonedVoices();
    }
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

  const fetchVoiceLibrary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching voice library...');
      const voiceList = await playhtClient.getVoices();
      console.log(`Fetched ${voiceList.length} voices`);

      // Keep original voice IDs from PlayHT
      const processedVoices = voiceList.map(voice => ({
        ...voice,
        // Don't modify the voice ID - use it as-is from PlayHT
        id: voice.id
      }));

      setVoices(processedVoices);
      setFilteredVoices(processedVoices);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch voices';
      console.error('Voice library fetch error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClonedVoices = async () => {
    if (!import.meta.env.VITE_ENABLE_VOICE_CLONING) {
      setError('Voice cloning is not enabled');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching cloned voices...');
      const clonedVoices = await playhtClient.getClonedVoices();
      console.log(`Fetched ${clonedVoices.length} cloned voices`);

      // Keep original voice IDs for cloned voices
      const processedVoices = clonedVoices.map(voice => ({
        ...voice,
        // Don't modify the voice ID - use it as-is from PlayHT
        id: voice.id
      }));

      setVoices(processedVoices);
      setFilteredVoices(processedVoices);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cloned voices';
      console.error('Cloned voices fetch error:', errorMessage);
      setError(errorMessage);
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
    setSelectedVoice(voice);
    onVoiceSelect(voice);
    setSearchTerm('');
    setShowDropdown(false);
    setFilteredVoices([]);
  };

  const getVoiceKey = (voice: Voice, index: number) => {
    // Create a unique key by combining multiple voice properties and index
    return `${voice.id}-${voice.name}-${voice.language}-${index}`;
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
        <div className="mt-2 text-red-400">{error}</div>
      )}

      {showDropdown && !isLoading && !error && filteredVoices.length > 0 && (
        <div className="fixed left-0 right-0 bottom-16 md:absolute md:bottom-auto md:mt-2 z-50">
          <div className="mx-4 md:mx-0 bg-[#1a1a4d]/95 backdrop-blur-sm rounded-lg border text-sm border-white/10">
            <div className="max-h-[calc(3*2.5rem)] overflow-y-auto">
              {filteredVoices.map((voice, index) => (
                <div
                  key={getVoiceKey(voice, index)}
                  onClick={() => handleVoiceSelect(voice)}
                  className="grid grid-cols-4 px-4 py-2 hover:bg-white/10 transition-colors duration-300 cursor-pointer"
                >
                  <div className="text-white/80">{voice.name}</div>
                  <div className="text-white/60">{voice.gender}</div>
                  <div className="text-white/60">{voice.accent}</div>
                  <div className="text-white/60">{voice.language}</div>
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
