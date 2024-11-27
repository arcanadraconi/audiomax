import { Button } from "../ui/button";
import { AudioLines } from 'lucide-react';

interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  language: string;
}

export function VoiceLibrary() {
  // Mock data - in real app, this would come from an API
  const voices: Voice[] = [
    { id: '1', name: 'Delilah', gender: 'female', accent: 'american', language: 'English (US)' },
    { id: '2', name: 'Charles', gender: 'male', accent: 'american', language: 'English (US)' },
    { id: '3', name: 'Madison', gender: 'female', accent: 'irish', language: 'English (IE)' },
    { id: '4', name: 'James', gender: 'male', accent: 'british', language: 'English (UK)' }
  ];

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
      <h3 className="text-white/80 mb-4">Your favorite's voice library</h3>
      {voices.map((voice) => (
        <Button 
          key={voice.id} 
          variant="ghost" 
          className="w-full justify-start text-white/60 text-md hover:bg-white/10 transition-colors duration-300 mb-2"
        >
          <div className="flex items-center w-full">
            <AudioLines className="mr-2 h-5 w-5" />
            <div className="grid grid-cols-4 w-full">
              <span className="text-white/80">{voice.name}</span>
              <span className="text-white/60">{voice.gender}</span>
              <span className="text-white/60">{voice.accent}</span>
              <span className="text-white/60">{voice.language}</span>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
