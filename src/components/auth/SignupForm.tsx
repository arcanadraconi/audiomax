import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*)';
    }
    return null;
  };

  const getErrorMessage = (error: AuthError) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/invalid-email':
        return 'Invalid email address format';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support';
      case 'auth/weak-password':
        return 'Password is too weak. Please use a stronger password';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'Failed to create account. Please try again';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Password validation
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/studio');
    } catch (err) {
      console.error('Signup error:', err);
      setError(getErrorMessage(err as AuthError));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2 text-white flex justify-center">Create your account</h2>
      <p className="text-white/60 mb-6 flex justify-center">Join AudioMax today</p>

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
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md mb-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#9de9c7]"
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
          <div className="text-xs text-white/60 space-y-1 mb-3">
            <p>Password must contain:</p>
            <ul className="list-disc pl-4">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
              <li>One special character (!@#$%^&*)</li>
            </ul>
          </div>
        </div>

        <div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#9de9c7]"
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4c0562] hover:text-[#4c0562]/80 transition-colors bg-transparent"
            >
              {showConfirmPassword ?
                <EyeOff className="h-5 w-5" /> :
                <Eye className="h-5 w-5" />
              }
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2 bg-transparent border-white/20"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              required
            />
            <span className="text-sm font-light text-white/70">
              I agree to the{' '}
              <button type="button" className="text-[#9de9c7]/70 hover:text-[#9de9c7]/90">Terms of Service</button>
              {' '}and{' '}
              <button type="button" className="text-[#9de9c7]/70 hover:text-[#9de9c7]/90">Privacy Policy</button>
            </span>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full"
        >
          Create account
        </Button>

        <div className="text-center text-sm">
          <span className="text-white/60">Already have an account? </span>
          <button 
            type="button" 
            className="text-[#9de9c7] hover:text-[#9de9c7]/80"
            onClick={() => navigate('/')}
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}
