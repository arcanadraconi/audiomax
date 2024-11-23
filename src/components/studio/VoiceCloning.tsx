import { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Upload, Play } from 'lucide-react';

export function VoiceCloning() {
  const [waveform, setWaveform] = useState<number[]>([]);
  const numBars = 40;

  useEffect(() => {
    const generateWaveform = () => {
      const newWaveform = Array.from({ length: numBars }, (_, i) => {
        const base = Math.sin((i / numBars) * Math.PI * 2) * 0.5 + 0.5;
        const random = Math.random() * 0.3;
        return Math.max(0.1, Math.min(1, base + random));
      });
      setWaveform(newWaveform);
    };

    const interval = setInterval(generateWaveform, 50);
    return () => clearInterval(interval);
  }, []);

  return (
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
  );
}
