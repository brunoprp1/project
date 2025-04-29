import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isClient: boolean;
  logs: any[];
  logsLoading: boolean;
  loadUserLogs: (userId: string, limit?: number) => Promise<any[]>;
  logout: () => Promise<void>;
  passwordReset: (email: string) => Promise<void>;
  passwordChange: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (userId: string, data: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isClient: false,
  logs: [],
  logsLoading: false,
  loadUserLogs: async () => [],
  logout: async () => {},
  passwordReset: async () => {},
  passwordChange: async () => {},
  updateProfile: async () => ({} as User),
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    user, 
    loading, 
    logs,
    logsLoading,
    loadUserLogs,
    logout,
    passwordReset,
    passwordChange,
    updateProfile 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user) {
        setIsAdmin(user.role === 'admin');
        setIsClient(user.role === 'client');
        
        // Only redirect if we're at login or register
        if (['/login', '/register', '/'].includes(location.pathname)) {
          navigate(user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard');
        }
      } else if (!['/login', '/register'].includes(location.pathname)) {
        navigate('/login');
      }
    }
  }, [user, loading, navigate, location.pathname]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isClient,
      logs,
      logsLoading,
      loadUserLogs,
      logout,
      passwordReset,
      passwordChange,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};