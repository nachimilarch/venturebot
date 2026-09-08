// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  role: string;
  is_superadmin: boolean;
}

interface AuthContextType {
  user: User | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, businessName: string, phone?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip tenant auth check entirely on superadmin routes
    if (window.location.pathname.startsWith('/superadmin')) {
      setIsLoading(false);
      return;
    }
    checkAuth();
  }, []);

  const mapUser = (u: any): User => ({
    id: String(u.id),
    name: u.name,
    email: u.email,
    tenantId: String(u.tenant_id ?? u.tenantId ?? ''),
    role: u.role || 'admin',
    is_superadmin: u.is_superadmin === true || u.is_superadmin === 1 || u.role === 'superadmin',
  });

const checkAuth = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.data.success && res.data.user) {
      setUser(mapUser(res.data.user));
    } else {
      setUser(null);
    }
  } catch {
    setUser(null);
  } finally {
    setIsLoading(false);
  }
};

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.success && res.data.user) {
        // Save token to localStorage for axios interceptors
        if (res.data.token) localStorage.setItem('token', res.data.token);
        setUser(mapUser(res.data.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    businessName: string,
    phone?: string,
  ): Promise<boolean> => {
    try {
      const res = await axios.post('/api/auth/register', {
        name, email, password, businessName, phone,
      });
      if (res.data.success && res.data.user) {
        if (res.data.token) localStorage.setItem('token', res.data.token);
        setUser(mapUser(res.data.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenantId: user?.tenantId || null,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};