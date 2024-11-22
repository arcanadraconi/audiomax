import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-white">Sign in to AudioMax</h2>
      <p className="text-white/60 mb-6">Enter your details to continue</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[#9de9c7] mb-1">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#9de9c7]"
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm text-[#9de9c7] mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#9de9c7]"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors bg-transparent"
            >
              {showPassword ? 
                <EyeOff className="h-5 w-5 text-white/60 hover:text-white" /> : 
                <Eye className="h-5 w-5 text-white/60 hover:text-white" />
              }
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2 bg-transparent border-white/20" />
            <span className="text-sm text-white/80">Remember me</span>
          </label>
          <a href="#" className="text-sm text-[#9de9c7] hover:text-[#9de9c7]/80">
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>

        <div className="text-center text-sm">
          <span className="text-white/60">Don't have an account? </span>
          <Link to="/signup" className="text-[#9de9c7] hover:text-[#9de9c7]/80">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}
