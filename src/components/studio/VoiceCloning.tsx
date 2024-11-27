import { useState, useEffect, useRef } from 'react';
import { Button } from "../ui/button";
import { Upload, Play, ClipboardCopy, Trash2 } from 'lucide-react';

export function VoiceCloning() {
  const [waveform, setWaveform] = useState<number[]>([]);
  const numBars = 100;
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = (currentTime - startTimeRef.current) * 0.001;

      const newWaveform = Array.from({ length: numBars }, (_, i) => {
        const phase = (i / numBars) * Math.PI * 4 + elapsed * 3;
        const wave1 = Math.sin(phase) * 0.3;
        const wave2 = Math.sin(phase * 2) * 0.15;
        const wave3 = Math.sin(phase * 0.5) * 0.15;
        const combined = wave1 + wave2 + wave3;
        const height = (combined + 1) * 0.5;
        const random = Math.random() * 0.05;
        return Math.max(0.15, Math.min(0.85, height + random));
      });

      setWaveform(newWaveform);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white/1 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white/80">Clone your voice</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:bg-white/10 transition-colors duration-300"
          >
            <ClipboardCopy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:bg-white/10 transition-colors duration-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 transition-colors duration-300 rounded-lg">
        <Button className="w-20 justify-start text-white/80 bg-white/1 hover:bg-white/1 transition-colors duration-300">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
        <div className="flex-1 h-12 bg-white/1 rounded-md flex items-end justify-around overflow-hidden px-1">
          {waveform.map((height, index) => (
            <div
              key={index}
              className="w-[1px] bg-primary transition-all duration-75 ease-in-out"
              style={{
                height: `${height * 100}%`,
                opacity: 0.5 + (height * 0.5)
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
