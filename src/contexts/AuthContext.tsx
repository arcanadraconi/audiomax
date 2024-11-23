import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  subscription: {
    plan: string;
    status: string;
  };
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

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  const login = async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual login logic with backend
      console.log('Login attempt with:', email);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newUser = {
        id: '1',
        email,
        role: 'user',
        subscription: {
          plan: 'free',
          status: 'active'
        },
        settings: {
          theme: 'system',
          emailNotifications: true,
          pushNotifications: false
        }
      };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('token', 'dummy-jwt-token');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual signup logic with backend
      console.log('Signup attempt with:', email);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newUser = {
        id: '1',
        email,
        role: 'user',
        subscription: {
          plan: 'free',
          status: 'active'
        },
        settings: {
          theme: 'system',
          emailNotifications: true,
          pushNotifications: false
        }
      };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('token', 'dummy-jwt-token');
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear all auth-related data
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.clear();
    
    // Clear any cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    console.log('Logged out and cleared all sessions');
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
