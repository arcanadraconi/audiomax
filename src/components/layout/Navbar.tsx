import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircleUserRound, Mic, FolderOpen, Settings } from 'lucide-react';

export function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0035]/50 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl md:text-3xl font-bold font-montserrat text-white ml-8 md:ml-0">
              
            </Link>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 p-2 rounded-full hover:bg-white/10 transition">
                <span className="text-sm text-white">{user.username}</span>
                <CircleUserRound  className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2 p-2 rounded-full hover:bg-white/10 transition">
                <Mic className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2 p-2 rounded-full hover:bg-white/10 transition">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2 p-2 rounded-full hover:bg-white/10 transition">
                <Settings className="h-5 w-5" />
              </div>
            
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
