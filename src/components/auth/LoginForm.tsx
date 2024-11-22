import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
          <label className="block text-sm text-[#40b4c7] mb-1">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#40b4c7]"
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm text-[#40b4c7] mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#40b4c7]"
            placeholder="Enter your password"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2 bg-transparent border-white/20" />
            <span className="text-sm text-white/80">Remember me</span>
          </label>
          <a href="#" className="text-sm text-[#40b4c7] hover:text-[#40b4c7]/80">
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
          <a href="#" className="text-[#40b4c7] hover:text-[#40b4c7]/80">
            Sign up
          </a>
        </div>
      </form>
    </div>
  );
}
