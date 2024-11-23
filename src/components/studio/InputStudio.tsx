import { Button } from "../ui/button";
import { Upload, Search, ChevronDown } from 'lucide-react';

export function InputStudio() {
  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
        <h2 className="text-2xl font-medium mb-4">Audiomax Studio</h2>
        <Button className="w-full justify-start text-white/80 bg-white/5 border border-white/20 hover:bg-white/10 transition-colors duration-300">
          <Upload className="mr-2 h-4 w-4" />
          Upload a document
        </Button>
        <textarea
          placeholder="or describing your idea in a few words"
          className="mt-4 min-h-[120px] w-full bg-transparent border border-white/20 rounded-md p-2 text-white placeholder:text-white/40 resize-none focus:outline-none"
        />
      </div>

      {/* Audience Selection */}
      <Button variant="outline" className="w-full justify-between text-white/80 bg-white/5 border-white/20 hover:bg-white/10 transition-colors duration-300 shadow-lg">
        Choose your audience
        <ChevronDown className="h-4 w-4" />
      </Button>

      {/* Voice Selection */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-white/10 shadow-lg">
        <div className="flex justify-between items-center">
          <span className="text-white/80">Voice's choice</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Library</span>
            <div className="w-10 h-5 bg-white/20 rounded-full relative">
              <div className="absolute w-4 h-4 bg-primary rounded-full left-0.5 top-0.5"></div>
            </div>
            <span className="text-sm text-white/60">Clone</span>
          </div>
        </div>
        <div className="relative mt-4 shadow-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
          <input
            placeholder="Library voices"
            className="w-full pl-10 p-2 bg-transparent border border-white/20 rounded-md text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Generate Button */}
      <Button className="w-full bg-[#63248d] hover:bg-[#7c2eb0] text-lg font-normal h-12 transition-colors duration-300" style={{ boxShadow: '0 4px 12px #00000030' }}>
        Generate audio
      </Button>
    </div>
  );
}
