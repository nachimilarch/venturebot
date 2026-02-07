import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/tenant';
import { userCredentials, tenants } from '@/data/tenants';

interface AuthContextType {
  user: User | null;
  tenantId: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('user');
    const storedTenantId = localStorage.getItem('tenantId');
    
    if (storedUser && storedTenantId) {
      setUser(JSON.parse(storedUser));
      setTenantId(storedTenantId);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const credentials = userCredentials[email.toLowerCase()];
    
    if (credentials && credentials.password === password) {
      const tenant = tenants[credentials.tenantId];
      const newUser: User = {
        email,
        tenantId: credentials.tenantId,
        name: credentials.name,
        role: credentials.role
      };
      
      setUser(newUser);
      setTenantId(credentials.tenantId);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('tenantId', credentials.tenantId);
      
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    setTenantId(null);
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
  };

  return (
    <AuthContext.Provider value={{ user, tenantId, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
