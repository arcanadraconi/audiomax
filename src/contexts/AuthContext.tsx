import { createContext, useContext, useState, ReactNode } from 'react';

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
  login: (email: string, _password: string) => Promise<void>;
  signup: (email: string, _password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: '1',
    email: 'dev@audiomax.com',
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
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement actual login logic with backend
      console.log('Login attempt with:', email);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({
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
      });
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
      setUser({
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
      });
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
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
