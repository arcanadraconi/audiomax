import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  settings: {
    theme: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Load user from localStorage
const loadUserFromStorage = () => {
  const storedUser = localStorage.getItem('user');
  return storedUser ? JSON.parse(storedUser) : null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadUserFromStorage());
  const [isLoading, setIsLoading] = useState(false);

  // Clear all non-AudioMax data from localStorage
  const clearNonAudioMaxData = () => {
    const audioMaxKeys = ['user', 'token', 'audiomax_theme'];
    Object.keys(localStorage).forEach(key => {
      if (!audioMaxKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });
  };

  useEffect(() => {
    clearNonAudioMaxData();
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Login URL:', `/.netlify/functions/auth/login`);
      const response = await fetch(`/.netlify/functions/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      const userData = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role || 'user',
        settings: data.user.settings || {
          theme: 'system',
          emailNotifications: true,
          pushNotifications: false
        }
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', data.token);
      localStorage.setItem('audiomax_theme', userData.settings.theme);

      // Clear any non-AudioMax data
      clearNonAudioMaxData();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Signup URL:', `/.netlify/functions/auth/register`);
      const response = await fetch(`/.netlify/functions/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data = await response.json();
      const userData = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role || 'user',
        settings: data.user.settings || {
          theme: 'system',
          emailNotifications: true,
          pushNotifications: false
        }
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', data.token);
      localStorage.setItem('audiomax_theme', userData.settings.theme);

      // Clear any non-AudioMax data
      clearNonAudioMaxData();
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('audiomax_theme');
    sessionStorage.clear();
    
    // Clear any cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Clear any non-AudioMax data
    clearNonAudioMaxData();
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
