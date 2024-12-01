import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "../components/ui/button";
import { InputStudio } from '../components/studio/InputStudio';
import { AudioPlayer } from '../components/studio/AudioPlayer';
import { VoiceCloning } from '../components/studio/VoiceCloning';
import { VoiceLibrary } from '../components/studio/favorites';
import { Navbar } from '../components/layout/Navbar';
import { AudioProcessingDemo } from '../components/studio/AudioProcessingDemo';

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

interface AudioGenerationEvent {
  url: string;
  title: string;
  transcript?: string;
  totalChunks: number;
  chunkIndex: number;
}

export default function Studio() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string>('Generated audio');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showDemo, setShowDemo] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [audioChunks, setAudioChunks] = useState<AudioGenerationEvent[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 769);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);

    // Add event listener for audio generation
    const handleAudioGenerated = (event: CustomEvent<AudioGenerationEvent>) => {
      const { url, title, transcript: newTranscript, totalChunks, chunkIndex } = event.detail;

      // Store the chunk
      setAudioChunks(prev => {
        const newChunks = [...prev];
        newChunks[chunkIndex] = event.detail;
        return newChunks;
      });

      // If this is the first chunk, set the transcript
      if (chunkIndex === 0 && newTranscript) {
        setTranscript(newTranscript);
      }

      // If we have all chunks, combine them
      if (chunkIndex === totalChunks - 1) {
        // Clean up previous audio URL if it exists
        if (generatedAudioUrl) {
          URL.revokeObjectURL(generatedAudioUrl);
        }
        setGeneratedAudioUrl(url);
        setAudioTitle(title.replace(/ \(Part \d+\)$/, '')); // Remove part number
        setIsGeneratingAudio(false);
        setGenerationProgress(0);
      }
    };

    // Add event listener for audio generation start
    const handleAudioGenerationStart = () => {
      setIsGeneratingAudio(true);
      setGenerationProgress(0);
      setAudioChunks([]);
    };

    // Add event listener for audio generation progress
    const handleAudioGenerationProgress = (event: CustomEvent<{ progress: number }>) => {
      setGenerationProgress(event.detail.progress);
    };

    window.addEventListener('audioGenerationStart', handleAudioGenerationStart);
    window.addEventListener('audioGenerated', handleAudioGenerated as EventListener);
    window.addEventListener('audioGenerationProgress', handleAudioGenerationProgress as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('audioGenerationStart', handleAudioGenerationStart);
      window.removeEventListener('audioGenerated', handleAudioGenerated as EventListener);
      window.removeEventListener('audioGenerationProgress', handleAudioGenerationProgress as EventListener);
      // Clean up audio URL
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
    };
  }, [generatedAudioUrl]);

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice);
  };


  return (
    <div className="w-full top-0 text-white font-sans">
      <Navbar />

      <div className="container mx-auto px-4 mt-8">
        <div className="mb-12 mt-16 flex justify-center md:justify-start">
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Instructions */}
          <div className="text-white/80 space-y-2 md:block">
            <div className="mb-4 mt-0 flex justify-center md:justify-start">
              <img
                src="/audiomax.png"
                alt="AudioMax Logo"
                className="w-90 md:w-100"
              />
            </div>
            <div className="flex justify-between items-center px-3">
              <p className="text-xl font-normal text-[#8ab9bd]">How to Use Audiomax Studio</p>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="md:hidden text-white/60 hover:bg-white/10 transition-colors duration-300"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>
            <div className={`space-y-2 ${isMobile && !isExpanded ? 'hidden' : 'block'}`}>
              <div className="px-3">
                <h3 className="text-sm text-[#8ab9bd]/90">Step 1: Upload Your Content</h3>
                <p className="text-sm text-white/60">Choose one of two ways to start:</p>
                <ul className="list-disc pl-5 mt-2 text-sm text-white/60 space-y-1">
                  <li>Upload a Document: Click the "Upload Document" button to add a file with the content you want to convert to audio.</li>
                  <li>Describe Your Idea: Type your idea in the text box below if you don't have a document.</li>
                </ul>
              </div>
              <div className="px-3">
                <h3 className="text-sm mb-2 text-[#8ab9bd]/90">Step 2: Customize Your Audio</h3>
                <ul className="list-disc pl-5 text-sm text-white/60 space-y-1">
                  <li>Select Your Audience: Use the dropdown to specify the audience type.</li>
                  <li>Choose a Voice: Click on the "Choose Your Voice" dropdown to browse available voice profiles.</li>
                  <li>Or, click Upload Voice to clone your unique voice for the audio.</li>
                </ul>
              </div>
              <div className="px-3">
                <h3 className="text-sm mb-2 text-[#8ab9bd]/90">Step 3: Generate Your Audio</h3>
                <ul className="list-disc pl-5 mt-2 text-sm text-white/60 space-y-1">
                  <li>Click the Generate Audio button. AudioMax will process your input and create a high-quality audio file tailored to your preferences.</li>
                </ul>
              </div>
            </div>

            {/* Demo Toggle */}
            <div className="px-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full text-white/70"
              >
                {showDemo ? 'Hide Processing Demo' : 'Show Processing Demo'}
              </Button>
            </div>

            {/* Processing Demo */}
            {showDemo && (
              <div className="px-3">
                <AudioProcessingDemo />
              </div>
            )}
          </div>

          {/* Middle Column - Main Controls */}
          <InputStudio />

          {/* Right Column - Audio Controls */}
          <div className="space-y-6">
            <AudioPlayer 
              title={audioTitle}
              audioUrl={generatedAudioUrl || undefined}
              isGenerating={isGeneratingAudio}
              generationProgress={generationProgress}
              transcript={transcript}
            />

            <VoiceCloning />
            <VoiceLibrary onVoiceSelect={handleVoiceSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
