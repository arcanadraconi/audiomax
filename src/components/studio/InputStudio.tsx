// Previous imports remain the same...
import { useState, useRef } from 'react';
import { Button } from "../ui/button";
import { Upload, ChevronDown, ChevronUp, X, Clock, FileText, Star, Volume2 } from 'lucide-react';
import { VoiceSearch } from './VoiceSearch';
import { OpenRouterService } from '../../lib/openRouterService';
import { useAudioProcessing } from '../../hooks/useAudioProcessing';
import { env } from '../../env';
import { playhtClient } from '../../lib/playht';

// Previous interfaces and constants remain the same...
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

interface ChunkInfo {
  text: string;
  wordCount: number;
  duration: number;
}

export function InputStudio() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string>('');
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<typeof audiences[0] | null>(null);
  const [isLibraryMode, setIsLibraryMode] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processedChunks, setProcessedChunks] = useState<ChunkInfo[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [totalWordCount, setTotalWordCount] = useState<number>(0);
  const [generationPhase, setGenerationPhase] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the audio processing hook
  const {
    processText: processAudio,
    isProcessing: isProcessingAudio,
    progress: audioProgress,
    error: audioError,
  } = useAudioProcessing();

  // Check if voice cloning is enabled from environment
  const isVoiceCloningEnabled = env.features.voiceCloning;

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    try {
      const text = await file.text();
      setTextInput(text);
      setSelectedFile(file);
      setError('');
    } catch (err) {
      setError('Failed to read file content');
      setSelectedFile(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setTextInput('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceSelect = (voice: Voice) => {
    console.log('Selected voice:', voice);
    setSelectedVoice(voice);
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
    setGenerationPhase('Generating transcript...');

    try {
      // Notify that audio generation is starting
      window.dispatchEvent(new CustomEvent('audioGenerationStart'));

      // Generate transcript with LLaMA
      console.log('Generating transcript...');
      const result = await OpenRouterService.generateTranscript(
        textInput,
        selectedAudience.description
      );
      console.log('Transcript generated:', result);

      // Process chunks with word count and duration
      const processedChunksWithInfo = result.chunks.map(chunk => {
        const wordCount = chunk.split(/\s+/).length;
        return {
          text: chunk,
          wordCount,
          duration: wordCount / 150 // 150 words per minute
        };
      });

      setProcessedChunks(processedChunksWithInfo);
      setEstimatedDuration(result.estimatedDuration);
      setTotalWordCount(result.fullText.split(/\s+/).length);

      // Generate audio using PlayHT
      setGenerationPhase('Generating audio...');
      console.log('Generating audio with PlayHT...');
      console.log('Voice:', selectedVoice);
      console.log('Text:', result.fullText);

      const audioResponse = await playhtClient.generateSpeech(result.fullText, {
        voice: selectedVoice.id,
        quality: 'premium',
        speed: 1.0,
      });

      console.log('Audio generated:', audioResponse);

      // Create URL for the audio
      const audioUrl = audioResponse.audioUrl;
      console.log('Audio URL:', audioUrl);

      // Notify parent component about the generated audio
      window.dispatchEvent(new CustomEvent('audioGenerated', {
        detail: {
          url: audioUrl,
          title: selectedFile ? selectedFile.name : 'Generated Audio'
        }
      }));

    } catch (err) {
      console.error('Content processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during processing';
      console.error('Error details:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      setGenerationPhase('');
    }
  };

  // Combine error messages
  const displayError = error || audioError;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
        <h2 className="text-3xl font-medium mb-4 text-[#8ab9bd]/80">Audiomax Studio</h2>

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
            className="w-full justify-start text-white/70 bg-white/5 border border-white/20 hover:bg-white/10 transition-colors duration-300 text-md font-light"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload a document
          </Button>
        )}

        {/* Error message */}
        {displayError && (
          <div className="mt-2 text-red-400 text-sm whitespace-pre-wrap">
            {displayError}
          </div>
        )}

        {/* File requirements */}
        <div className="mt-2 text-white/50 text-xs">
          Supported formats: PDF, TXT, DOCX, DOC, MD (Max size: 5MB)
        </div>

        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="or describing your idea in a few words"
          className="mt-4 min-h-[120px] w-full bg-transparent border border-white/20 rounded-md p-2 text-white placeholder:text-white/40 resize-none focus:outline-none"
        />

        {/* Content Analysis */}
        {estimatedDuration > 0 && (
          <div className="mt-3 p-3 bg-white/5 rounded-md">
            <div className="text-white/70 text-sm">Content Analysis:</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="text-white/60 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Words: {totalWordCount}
              </div>
              <div className="text-white/60 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
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
          {isAudienceDropdownOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
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
        />

        {selectedVoice && (
          <div className="mt-4 px-4 py-2 bg-white/10 rounded-md ">
            <div className="text-white/80 text-md font-mormal flex justify-left items-center mb-2">{selectedVoice.name} <Star className="h-4 w-4 text-white/40 ml-2" /><Volume2 className="h-4 w-4 text-white/40 ml-2 " /></div>
            <div className="text-white/60 text-sm">
              {selectedVoice.gender}, {selectedVoice.age}, {selectedVoice.style}, {selectedVoice.tempo}
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
          {isGenerating ? generationPhase : isProcessingAudio ? `Processing audio (${audioProgress?.phase})...` : 'Generate audio'}
        </Button>

        {/* Audio Processing Progress */}
        {audioProgress && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-white/60">
              <span>{audioProgress.phase}</span>
              <span>{Math.round(audioProgress.progress)}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${audioProgress.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Sections */}
      {processedChunks.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <h3 className="text-white/80 mb-4">Content Sections ({processedChunks.length})</h3>
          <div className="space-y-4">
            {processedChunks.map((chunk, index) => (
              <div key={index} className="p-3 bg-white/10 rounded-md">
                <div className="flex justify-between items-center text-white/60 text-sm mb-2">
                  <div>Section {index + 1}</div>
                  <div className="flex items-center gap-4">
                    <span>{chunk.wordCount} words</span>
                    <span>~{Math.round(chunk.duration)} min</span>
                  </div>
                </div>
                <div className="text-white/80">{chunk.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
