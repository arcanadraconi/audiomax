import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { SignupForm } from '../components/auth/SignupForm';
import { useAuth } from '../contexts/AuthContext';

export function IndexSignup() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen" role="status">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }
  
    if (isAuthenticated) {
      return <Navigate to="/studio" />;
    }
  
    return (
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-16rem)] gap-8 md:gap-12 items-center px-4 md:px-6">
        {/* Hero Section */}
        <div className="flex-1 text-center md:text-left">
          <img 
            src="/audiomax.png" 
            alt="AudioMax Logo" 
            className="w-[400px] md:w-[400px] mx-auto md:mx-0 mb-8"
          />
          <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary via-secondary to-accent text-transparent bg-clip-text animate-gradient">
            Join the Audio Revolution
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto md:mx-0">
            Start creating AI-Generated Personalized High-Quality Audio Content today. Perfect for content creators, educators, and storytellers.
          </p>
        </div>
  
        {/* Auth Section */}
        <div className="w-full md:flex-1 md:max-w-md">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 md:p-8 border border-white/10" style={{ boxShadow: '0 4px 12px #00000030' }}>
            <SignupForm />
          </div>
        </div>
      </div>
    );
  }
