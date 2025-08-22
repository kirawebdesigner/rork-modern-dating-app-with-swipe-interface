import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthContextType>(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('auth_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    // Mock login - in production, this would call your backend
    const mockUser: AuthUser = {
      id: 'current',
      email,
      name: email.split('@')[0],
    };
    
    await AsyncStorage.setItem('auth_user', JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    // Mock signup - in production, this would call your backend
    const mockUser: AuthUser = {
      id: 'current',
      email,
      name,
    };
    
    await AsyncStorage.setItem('auth_user', JSON.stringify(mockUser));
    setUser(mockUser);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('auth_user');
    setUser(null);
  }, []);

  return useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  }), [user, isLoading, login, signup, logout]);
});