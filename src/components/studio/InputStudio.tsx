import { useState, useRef, useEffect } from 'react';
import { Button } from "../ui/button";
import { Paperclip, Camera, Mic, X, ChevronDown, Volume2 } from 'lucide-react';
import { VoiceSearch } from './VoiceSearch';
import { OpenRouterService } from '../../lib/openRouterService';
import { useAudioProcessing } from '../../hooks/useAudioProcessing';
import { env } from '../../env';
import { Voice as PlayHTVoice } from '../../lib/playht';
import { PlayHTWebSocket } from '../../lib/services/playhtWebSocket';


const ALLOWED_FILE_TYPES = ['.pdf', '.txt', '.docx', '.doc', '.md'];
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB in bytes
const MAX_IMAGES = 5;

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

interface InputStudioProps {
  voices: PlayHTVoice[];
  favoriteVoices: Set<string>;
  onVoiceSelect: (voice: PlayHTVoice) => void;
  onFavoriteToggle: (voice: PlayHTVoice) => void;
  onPlaySample: (voice: PlayHTVoice) => void;
}

export function InputStudio({
  voices,
  favoriteVoices,
  onVoiceSelect: parentVoiceSelect,
  onFavoriteToggle: parentFavoriteToggle,
  onPlaySample: parentPlaySample
}: InputStudioProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string>('');
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<typeof audiences[0] | null>(null);
  const [isLibraryMode, setIsLibraryMode] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<PlayHTVoice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [totalWordCount, setTotalWordCount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const webSocketRef = useRef<PlayHTWebSocket | null>(null);

  // Use the audio processing hook
  const {
    isProcessing: isProcessingAudio,
    error: audioError,
  } = useAudioProcessing();

  // Check if voice cloning is enabled from environment
  const isVoiceCloningEnabled = env.features.voiceCloning;

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.disconnect();
        webSocketRef.current = null;
      }
    };
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 15MB limit';
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return 'Invalid file type. Allowed types: PDF, TXT, DOCX, DOC, MD';
    }

    return null;
  };

  const validateImage = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'Image size exceeds 15MB limit';
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(fileExtension)) {
      return 'Invalid image type. Allowed types: JPG, JPEG, PNG, GIF';
    }

    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const text = await file.text();
      setTextInput(text);
      setError('');
    } catch (err) {
      setError('Failed to read file content');
    }
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const validFiles = [];
    for (const file of files) {
      const validationError = validateImage(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      validFiles.push(file);
    }

    setSelectedImages([...selectedImages, ...validFiles]);
    setError('');
  };

  const removeImage = (index: number) => {
    setSelectedImages(images => images.filter((_, i) => i !== index));
  };

  const handleVoiceSelect = (voice: PlayHTVoice) => {
    console.log('Selected voice for generation:', {
      name: voice.name,
      id: voice.id,
      gender: voice.gender,
      accent: voice.accent,
      sample: voice.sample
    });
    setSelectedVoice(voice);
    parentVoiceSelect(voice);
  };

  const handleFavoriteToggle = (voice: PlayHTVoice) => {
    parentFavoriteToggle(voice);
  };

  const handlePlaySample = (voice: PlayHTVoice) => {
    if (voice.sample) {
      parentPlaySample(voice);
    }
  };

  const clearSelectedVoice = () => {
    setSelectedVoice(null);
    // Show voice search dropdown when clearing selection
    const searchInput = document.querySelector('input[placeholder*="Search voice"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleGenerateClick = async () => {
    if (!textInput.trim()) {
      setError('Please enter text or upload a document');
      return;
    }

    if (!selectedAudience) {
      setError('Please select an audience');
      return;
    }

    if (!selectedVoice) {
      setError('Please select a voice');
      return;
    }

    setError('');
    setIsGenerating(true);

    // Dispatch audio generation start event
    window.dispatchEvent(new CustomEvent('audioGenerationStart'));

    try {
      // Generate transcript with LLM
      console.log('Generating transcript...');
      const result = await OpenRouterService.generateTranscript(
        textInput,
        selectedAudience.description
      );
      console.log('Transcript generated:', result);

      // Generate title
      const titleResult = await OpenRouterService.generateTitle(result.fullText);
      console.log('Title generated:', titleResult);

      // Update word count and duration
      setEstimatedDuration(result.estimatedDuration);
      setTotalWordCount(result.fullText.split(/\s+/).length);

      // Get WebSocket instance
      webSocketRef.current = PlayHTWebSocket.getInstance(
        env.playht.secretKey,
        env.playht.userId,
        (progress) => {
          // Dispatch progress event
          window.dispatchEvent(new CustomEvent('audioGenerationProgress', {
            detail: { progress: progress.progress }
          }));
        },
        (audioUrl) => {
          console.log('Audio generation complete:', audioUrl);
          // Dispatch audio generated event
          window.dispatchEvent(new CustomEvent('audioGenerated', {
            detail: {
              url: audioUrl,
              title: titleResult.title,
              transcript: result.fullText,
              totalChunks: 1,
              chunkIndex: 0
            }
          }));
          setIsGenerating(false);
        },
        (error) => {
          console.error('WebSocket error:', error);
          setError(error);
          setIsGenerating(false);
        }
      );

      // Generate speech using WebSocket
      console.log('Starting WebSocket audio generation with voice:', {
        id: selectedVoice.id,
        name: selectedVoice.name,
        gender: selectedVoice.gender
      });
      await webSocketRef.current.generateSpeech(result.fullText, selectedVoice.id);

    } catch (err) {
      console.error('Content processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during processing';
      console.error('Error details:', errorMessage);
      setError(errorMessage);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Input Area */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:px-4 border border-white/10 shadow-lg">
        <h2 className="text-3xl px-2 font-medium mb-6 text-[#8ab9bd]/80">Audiomax Studio</h2>
        
        {/* Text Area with Bottom Actions */}
        <div className="relative mb-1">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Share your ideas for audio content transformation..."
            className="w-full h-40 p-4 text-sm text-white/70 bg-white/5 rounded-lg border border-white/10 focus:border-white/20 focus:ring-0 resize-none"
          />
          
          {/* Bottom Actions */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-white/40 hover:text-white/90 hover:bg-white/5 rounded-lg transition-all duration-200"
              title="Upload File (max 15mb)"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-1.5 text-white/40 hover:text-white/90 hover:bg-white/5 rounded-lg transition-all duration-200"
              title="Add images (max 5)"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              className="p-1.5 text-white/40 hover:text-white/90 hover:bg-white/5 rounded-lg transition-all duration-200"
              title="Voice input"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Hidden file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={ALLOWED_FILE_TYPES.join(',')}
          className="hidden"
        />
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageSelect}
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
        />

        {/* Selected Images Preview */}
        {selectedImages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Upload ${index + 1}`}
                  className="h-16 w-16 object-cover rounded-md border border-white/10"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {(error || audioError) && (
          <div className="mt-2 text-red-400 text-sm whitespace-pre-wrap">
            {error || audioError}
          </div>
        )}

        {/* Content Analysis */}
        {estimatedDuration > 0 && (
          <div className="mt-3 p-3 bg-white/5 rounded-md">
            <div className="text-white/70 text-sm">Content Analysis:</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="text-white/60 flex items-center">
                Words: {totalWordCount}
              </div>
              <div className="text-white/60 flex items-center">
                Duration: ~{Math.round(estimatedDuration)} minutes
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audience Selection */}
      <div className="relative z-20">
        <Button
          variant="outline"
          onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
          className="w-full justify-between text-white/70 bg-white/5 border-white/20 py-6 hover:bg-white/10 transition-colors duration-300 shadow-lg text-md font-normal"
        >
          {selectedAudience ? selectedAudience.name : 'Choose your audience'}
          <ChevronDown className="h-4 w-4" />
        </Button>

        {isAudienceDropdownOpen && (
          <div className="absolute z-30 w-full mt-2 bg-[#1a1a4d]/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg overflow-hidden">
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
      <div className="relative z-10 bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 mb-2 border border-white/10 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-white/70">Voice's choice</span>
          {isVoiceCloningEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Library</span>
              <button
                onClick={() => setIsLibraryMode(!isLibraryMode)}
                className="w-10 h-5 bg-white/20 rounded-full relative"
              >
                <div
                  className={`absolute w-4 h-4 bg-primary rounded-full top-0.5 transition-all duration-300 ${isLibraryMode ? 'left-0.5' : 'left-[calc(100%-20px)]'}`}
                />
              </button>
              <span className="text-sm text-white/60">Clone</span>
            </div>
          )}
        </div>

        <VoiceSearch
          isLibraryMode={isLibraryMode}
          onVoiceSelect={handleVoiceSelect}
          onFavoriteToggle={handleFavoriteToggle}
          onPlaySample={handlePlaySample}
          favoriteVoices={favoriteVoices}
          voices={voices}
        />

        {selectedVoice && (
          <div className="mt-4 px-4 py-3 bg-white/10 rounded-md relative group">
            <button
              onClick={clearSelectedVoice}
              className="absolute -top-2 -right-2 bg-white/10 hover:bg-white/20 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Clear selection"
            >
              <X className="h-3 w-3 text-white" />
            </button>
            
            {/* Voice name */}
            <div className="flex justify-between items-center mb-2">
              <div className="text-white/80 text-md font-normal">{selectedVoice.name}</div>
              {selectedVoice.sample && (
                <button
                  onClick={() => handlePlaySample(selectedVoice)}
                  className="p-1 text-white/40 hover:text-white/90 transition-colors"
                  title="Play sample"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Voice parameters */}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-white/60">{selectedVoice.gender || 'unknown'}</div>
              <div className="text-white/60">{selectedVoice.age || 'adult'}</div>
              <div className="text-white/60">{selectedVoice.style || 'normal'}</div>
              <div className="text-white/60">{selectedVoice.tempo || 'neutral'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="relative z-0">
        <Button
          onClick={handleGenerateClick}
          disabled={isGenerating || isProcessingAudio || !textInput.trim() || !selectedVoice || !selectedAudience}
          className="w-full bg-[#4c0562] hover:bg-[#63248D] text-lg font-normal h-12 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: '0 4px 12px #00000030' }}
        >
          Generate audio
        </Button>
      </div>
    </div>
  );
}
