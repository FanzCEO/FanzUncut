'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: 'fan' | 'creator' | 'moderator' | 'admin';
  isVerified: boolean;
  subscriptions: string[];
  createdAt: string;
  isCreator?: boolean;
  creatorProfile?: {
    subscriptionPrice: number;
    followers: number;
    posts: number;
    bio: string;
    tags: string[];
  };
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  displayName: string;
  accountType: 'fan' | 'creator';
  agreedToTerms: boolean;
  isOver18: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock API functions - replace with real API calls
const mockApi = {
  login: async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation - replace with real authentication
    if (email === 'admin@boyfanz.com' && password === 'admin123') {
      return {
        user: {
          id: '1',
          username: 'admin',
          email: 'admin@boyfanz.com',
          displayName: 'Admin User',
          avatar: '/api/placeholder/40/40',
          role: 'admin',
          isVerified: true,
          subscriptions: [],
          createdAt: '2024-01-01T00:00:00Z'
        }
      };
    }
    
    if (email === 'creator@boyfanz.com' && password === 'creator123') {
      return {
        user: {
          id: '2',
          username: 'alpha_muscle_god',
          email: 'creator@boyfanz.com',
          displayName: 'Alpha Muscle God',
          avatar: '/api/placeholder/40/40',
          role: 'creator',
          isVerified: true,
          subscriptions: [],
          createdAt: '2024-01-01T00:00:00Z',
          isCreator: true,
          creatorProfile: {
            subscriptionPrice: 19.99,
            followers: 12500,
            posts: 387,
            bio: 'Underground bodybuilder and fitness alpha.',
            tags: ['Fitness', 'Alpha', 'Muscle']
          }
        }
      };
    }
    
    if (email === 'fan@boyfanz.com' && password === 'fan123') {
      return {
        user: {
          id: '3',
          username: 'underground_fan',
          email: 'fan@boyfanz.com',
          displayName: 'Underground Fan',
          avatar: '/api/placeholder/40/40',
          role: 'fan',
          isVerified: false,
          subscriptions: ['1', '2'],
          createdAt: '2024-01-15T00:00:00Z'
        }
      };
    }
    
    return { error: 'Invalid email or password' };
  },
  
  signup: async (userData: SignupData): Promise<{ user?: User; error?: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Mock validation
    if (userData.email === 'test@example.com') {
      return { error: 'Email already exists' };
    }
    
    // Create new user
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName,
      avatar: '/api/placeholder/40/40',
      role: userData.accountType,
      isVerified: false,
      subscriptions: [],
      createdAt: new Date().toISOString(),
      isCreator: userData.accountType === 'creator',
      creatorProfile: userData.accountType === 'creator' ? {
        subscriptionPrice: 9.99,
        followers: 0,
        posts: 0,
        bio: '',
        tags: []
      } : undefined
    };
    
    return { user: newUser };
  }
};

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('boyfanz_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('boyfanz_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Save user to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('boyfanz_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('boyfanz_user');
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const result = await mockApi.login(email, password);
      
      if (result.user) {
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const result = await mockApi.signup(userData);
      
      if (result.user) {
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Signup failed' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('boyfanz_user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}