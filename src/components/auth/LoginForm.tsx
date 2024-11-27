import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const getErrorMessage = (error: AuthError) => {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Invalid email address format';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'Failed to sign in. Please try again';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/studio');
    } catch (err) {
      console.error('Login error:', err);
      setError(getErrorMessage(err as AuthError));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-white flex justify-center">Welcome to AudioMax</h2>
      <p className="text-white/60 mb-6 flex justify-center">Enter your details to continue</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-red-500 text-sm text-center mb-4 bg-red-500/10 py-2 rounded-md">
            {error}
          </div>
        )}
        
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 mb-3 rounded-lg text-white placeholder:text-white/50 bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#9de9c7]"
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div>
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
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4c0562] hover:text-[#4c0562]/80 transition-colors bg-transparent"
            >
              {showPassword ? 
                <EyeOff className="h-5 w-5" /> : 
                <Eye className="h-5 w-5" />
              }
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2 bg-transparent border-white/20" />
            <span className="text-sm text-white/80">Remember me</span>
          </label>
          <button type="button" className="text-sm text-[#9de9c7] hover:text-[#9de9c7]/80">
           Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full"
        >
          Continue
        </Button>

        <div className="text-center text-sm">
          <span className="text-white/60">New to AudioMax? </span>
          <button 
            type="button" 
            className="text-[#9de9c7] hover:text-[#9de9c7]/80"
            onClick={() => navigate('/signup')}
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
}
