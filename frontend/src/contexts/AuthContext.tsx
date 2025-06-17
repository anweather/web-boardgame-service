import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, ApiError } from '../types';
import apiService from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user on app initialization
    const initializeAuth = () => {
      try {
        const savedUser = localStorage.getItem('boardgame-user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('boardgame-user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiService.login(username, password);
      
      setUser(response.user);
      localStorage.setItem('boardgame-user', JSON.stringify(response.user));
      
      // Store token if provided (for future authentication)
      if (response.token) {
        localStorage.setItem('boardgame-token', response.token);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, password: string, email: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiService.register(username, password, email);
      
      // Optionally auto-login after registration
      setUser(response.user);
      localStorage.setItem('boardgame-user', JSON.stringify(response.user));
      
      if (response.token) {
        localStorage.setItem('boardgame-token', response.token);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem('boardgame-user');
    localStorage.removeItem('boardgame-token');
    
    // Clear any other auth-related state
    // Could also clear socket connections here if needed
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    register,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper hooks for common auth checks
export const useRequireAuth = (): User => {
  const { user, loading } = useAuth();
  
  if (loading) {
    throw new Error('Authentication still loading');
  }
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  return user;
};

export const useIsAuthenticated = (): boolean => {
  const { user, loading } = useAuth();
  return !loading && !!user;
};