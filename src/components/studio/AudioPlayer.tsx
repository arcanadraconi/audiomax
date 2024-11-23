import { Button } from "../ui/button";
import { Play, SkipBack, SkipForward } from 'lucide-react';

export function AudioPlayer() {
  return (
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
  );
}
