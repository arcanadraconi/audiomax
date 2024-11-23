import { useState, useEffect } from 'react';
import { Button } from "../components/ui/button";
import { Upload, Search, ChevronDown, Play, SkipBack, SkipForward, AudioLines } from 'lucide-react';
import { InputStudio } from '../components/studio/InputStudio';

export default function Studio() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);
  const numBars = 40; // More bars for a smoother waveform

  useEffect(() => {
    // Function to generate smooth waveform data
    const generateWaveform = () => {
      const newWaveform = Array.from({ length: numBars }, (_, i) => {
        // Create a smoother sine wave pattern
        const base = Math.sin((i / numBars) * Math.PI * 2) * 0.5 + 0.5;
        const random = Math.random() * 0.3; // Smaller random factor for more natural movement
        return Math.max(0.1, Math.min(1, base + random)); // Ensure values stay within bounds
      });
      setWaveform(newWaveform);
    };

    // Update waveform more frequently for smoother animation
    const interval = setInterval(generateWaveform, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className=" w-full top-0 text-white font-sans">
      {/* Main Content */}
      <div className="container mx-auto px-4">
        {/* Logo */}
        <div className="mb-12 flex justify-center md:justify-start">
          <img
            src="/audiomax.png"
            alt="AudioMax Logo"
            className="w-80 md:w-100"
          />
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Instructions */}
          <div className={`text-white/80 space-y-6 ${isMenuOpen ? 'block' : 'hidden'} md:block`}>
            <h2 className="text-xl font-medium">How to Use Audiomax Studio</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-white/90 mb-2">Step 1: Upload Your Content</h3>
                <p className="text-md text-white/60">Choose one of two ways to start:</p>
                <ul className="list-disc pl-5 mt-2 text-md text-white/60 space-y-1">
                  <li>Upload a Document: Click the "Upload Document" button to add a file with the content you want to convert to audio.</li>
                  <li>Describe Your Idea: Type your idea in the text box below if you don't have a document.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white/90 mb-2">Step 2: Customize Your Audio</h3>
                <ul className="list-disc pl-5 text-md text-white/60 space-y-1">
                  <li>Select Your Audience: Use the dropdown to specify the audience type.</li>
                  <li>Choose a Voice: Click on the "Choose Your Voice" dropdown to browse available voice profiles.</li>
                  <li>Or, click Upload Voice to clone your unique voice for the audio.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white/90 mb-2">Step 3: Generate Your Audio</h3>
                <p className="text-md text-white/60">Click the Generate Audio button. AudioMax will process your input and create a high-quality audio file tailored to your preferences.</p>
              </div>
            </div>
          </div>

          {/* Middle Column - Main Controls */}
          <InputStudio />

          {/* Right Column - Audio Controls */}
          <div className="space-y-6">
            {/* Audio Player */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
              <div className="flex justify-between items-center text-sm text-white/60">
                <span>Generated Audio</span>
                <span>audio title</span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10 transition-colors duration-300">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10 transition-colors duration-300">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10 transition-colors duration-300">
                  <SkipForward className="h-4 w-4" />
                </Button>
                <div className="flex-1 h-1 bg-white/20 rounded-full mx-4">
                  <div className="w-1/3 h-full bg-primary rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Clone Voice */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
              <h3 className="text-white/80 mb-4">Clone your voice</h3>
              <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 transition-colors duration-300 rounded-lg">
                <Button className="flex-1 justify-start text-white/80 bg-white/1 hover:bg-white/1 transition-colors duration-300">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload voice
                </Button>
                <div className="w-32 h-12 bg-white/10 rounded-md flex items-end justify-around overflow-hidden">
                  {waveform.map((height, index) => (
                    <div
                      key={index}
                      className="w-[2px] bg-primary transition-all duration-100 ease-in-out"
                      style={{ 
                        height: `${height * 100}%`,
                        opacity: 0.6 + (height * 0.4)
                      }}
                    />
                  ))}
                </div>
                <Button size="icon" className="text-white/60 bg-white/1 hover:bg-white/10 transition-colors duration-300">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Voice Library */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
              <h3 className="text-white/80 mb-4">Your favorite's voice library</h3>
              {[1, 2, 3, 4, 5].map((i) => (
                <Button key={i} variant="ghost" className="w-full justify-start text-white/60 text-md hover:bg-white/10 transition-colors duration-300">
                  <AudioLines className="mr-2 h-5 w-5" />
                  Voice {i}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
