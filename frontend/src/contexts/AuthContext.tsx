import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('[AuthContext] Checking authentication...');
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success && response.data.user) {
        console.log('[AuthContext] User authenticated:', response.data.user);
        setUser({
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          tenantId: response.data.user.tenant_id || response.data.user.tenantId,
          role: response.data.user.role || 'admin'
        });
      } else {
        console.log('[AuthContext] Not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.log('[AuthContext] Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('[AuthContext] Logging in...');
      const response = await axios.post('/api/auth/login', { email, password });

      if (response.data.success && response.data.user) {
        console.log('[AuthContext] Login successful');
        setUser({
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          tenantId: response.data.user.tenant_id || response.data.user.tenantId,
          role: response.data.user.role || 'admin'
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('[AuthContext] Registering...');
      const response = await axios.post('/api/auth/register', { name, email, password });

      if (response.data.success && response.data.user) {
        console.log('[AuthContext] Registration successful');
        setUser({
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          tenantId: response.data.user.tenant_id || response.data.user.tenantId,
          role: response.data.user.role || 'admin'
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('[AuthContext] Logging out...');
      await axios.post('/api/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Clear user anyway
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    tenantId: user?.tenantId || null,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
