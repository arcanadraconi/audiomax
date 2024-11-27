export interface Voice {
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

export interface VoiceLibraryProps {
  onVoiceSelect: (voice: Voice) => void;
}

export function VoiceLibrary({ onVoiceSelect }: VoiceLibraryProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
      <h2 className="text-xl font-medium text-white/80 mb-4">Voice Library</h2>
      {/* Content will be added later */}
    </div>
  );
}
