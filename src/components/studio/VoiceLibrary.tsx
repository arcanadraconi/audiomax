import { Button } from "../ui/button";
import { AudioLines } from 'lucide-react';

export function VoiceLibrary() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
      <h3 className="text-white/80 mb-4">Your favorite's voice library</h3>
      {[1, 2, 3, 4, 5].map((i) => (
        <Button key={i} variant="ghost" className="w-full justify-start text-white/60 text-md hover:bg-white/10 transition-colors duration-300">
          <AudioLines className="mr-2 h-5 w-5" />
          Voice {i}
        </Button>
      ))}
    </div>
  );
}
