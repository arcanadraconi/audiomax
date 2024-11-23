import { useState } from 'react';
import { InputStudio } from '../components/studio/InputStudio';
import { AudioPlayer } from '../components/studio/AudioPlayer';
import { VoiceCloning } from '../components/studio/VoiceCloning';
import { VoiceLibrary } from '../components/studio/VoiceLibrary';

export default function Studio() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <AudioPlayer />

            {/* Clone Voice */}
            <VoiceCloning />

            {/* Voice Library */}
            <VoiceLibrary />
          </div>
        </div>
      </div>
    </div>
  );
}
