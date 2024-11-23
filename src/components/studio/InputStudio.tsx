import { useState, useRef } from 'react';
import { Button } from "../ui/button";
import { Upload, ChevronDown, ChevronUp, X } from 'lucide-react';
import { VoiceSearch } from './VoiceSearch';

// Define allowed file types and max size (5MB)
const ALLOWED_FILE_TYPES = ['.pdf', '.txt', '.docx', '.doc', '.md'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

const audiences = [
  {
    id: 'social-media',
    name: 'Social Media-Friendly, Podcast',
    description: 'short, engaging, casual, conversational'
  },
  {
    id: 'educational',
    name: 'Educational, Teaching, Training',
    description: 'structured, informative, accessible'
  },
  {
    id: 'storytelling',
    name: 'Storytelling, Narrative, Entertaining',
    description: 'compelling, narrative-driven, engaging, captivating'
  },
  {
    id: 'deep-content',
    name: 'Deep/Debate Content, Motivational, TedTalk',
    description: 'thought-provoking, insightful, balanced'
  },
  {
    id: 'meditation',
    name: 'Meditation, Mantra, Prayers, ASMR',
    description: 'smooth, calm, slow'
  }
];

interface Voice {
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

export function InputStudio() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<typeof audiences[0] | null>(null);
  const [isLibraryMode, setIsLibraryMode] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 5MB limit';
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return 'Invalid file type. Allowed types: PDF, TXT, DOCX, DOC, MD';
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
        <h2 className="text-2xl font-medium mb-4">Audiomax Studio</h2>
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={ALLOWED_FILE_TYPES.join(',')}
          className="hidden"
        />

        {/* Upload button or selected file display */}
        {selectedFile ? (
          <div className="flex items-center justify-between p-2 bg-white/10 rounded-md">
            <span className="text-white/80 truncate">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="text-white/60 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleUploadClick}
            className="w-full justify-start text-white/80 bg-white/5 border border-white/20 hover:bg-white/10 transition-colors duration-300 text-md font-normal"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload a document
          </Button>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-2 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* File requirements */}
        <div className="mt-2 text-white/40 text-xs">
          Supported formats: PDF, TXT, DOCX, DOC, MD (Max size: 5MB)
        </div>

        <textarea
          placeholder="or describing your idea in a few words"
          className="mt-4 min-h-[120px] w-full bg-transparent border border-white/20 rounded-md p-2 text-white placeholder:text-white/40 resize-none focus:outline-none"
        />
      </div>

      {/* Audience Selection */}
      <div className="relative">
        <Button 
          variant="outline" 
          onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
          className="w-full justify-between text-white/70 bg-white/5 border-white/20 hover:bg-white/10 transition-colors duration-300 shadow-lg text-md font-normal"
        >
          {selectedAudience ? selectedAudience.name : 'Choose your audience'}
          {isAudienceDropdownOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {isAudienceDropdownOpen && (
          <div className="absolute z-10 w-full mt-2 bg-[#1a1a4d]/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg overflow-hidden">
            {audiences.map((audience) => (
              <button
                key={audience.id}
                onClick={() => {
                  setSelectedAudience(audience);
                  setIsAudienceDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-md hover:bg-white/10 transition-colors duration-300 text-white/70"
              >
                {audience.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice Selection */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 mb-2 border border-white/10 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/80">Voice's choice</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Library</span>
            <button
              onClick={() => setIsLibraryMode(!isLibraryMode)}
              className="w-10 h-5 bg-white/20 rounded-full relative"
            >
              <div 
                className={`absolute w-4 h-4 bg-primary rounded-full top-0.5 transition-all duration-300 ${
                  isLibraryMode ? 'left-0.5' : 'left-[calc(100%-20px)]'
                }`}
              />
            </button>
            <span className="text-sm text-white/60">Clone</span>
          </div>
        </div>

        <VoiceSearch 
          isLibraryMode={isLibraryMode}
          onVoiceSelect={handleVoiceSelect}
        />

        {selectedVoice && (
          <div className="mt-2 px-3 py-1 bg-white/10 rounded-md">
            <div className="text-white/80 text-sm font-medium">{selectedVoice.name}</div>
            <div className="text-white/60 text-sm">
              {selectedVoice.gender}, {selectedVoice.age}, {selectedVoice.style}, {selectedVoice.tempo}
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button className="w-full bg-[#63248d] hover:bg-[#7c2eb0] text-lg font-normal h-12 transition-colors duration-300" style={{ boxShadow: '0 4px 12px #00000030' }}>
        Generate audio
      </Button>
    </div>
  );
}
