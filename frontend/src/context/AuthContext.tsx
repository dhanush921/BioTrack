import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Administrator' | 'Biomedical Engineer' | 'Technician' | 'Department Staff';
  department: string;
  avatar?: string;
  notifications: {
    calibration: boolean;
    warranty: boolean;
    breakdowns: boolean;
    tasks: boolean;
  };
  themePreference: 'dark' | 'light';
  approved?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: string, department: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User> & { password?: string }) => Promise<void>;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      // MIGRATION: move old localStorage token to sessionStorage (one-time, per tab)
      const legacyToken = localStorage.getItem('biotrack_token');
      if (legacyToken && !sessionStorage.getItem('biotrack_token')) {
        // Move the old token into this tab's session
        sessionStorage.setItem('biotrack_token', legacyToken);
      }
      // Always clear from localStorage so multi-tab isolation works going forward
      localStorage.removeItem('biotrack_token');

      const token = sessionStorage.getItem('biotrack_token');
      if (token) {
        try {
          const profile = await api.get('/auth/me');
          setUser(profile);
          
          // Apply user saved theme
          if (profile.themePreference) {
            localStorage.setItem('biotrack_theme', profile.themePreference);
            if (profile.themePreference === 'dark') {
              document.documentElement.classList.add('dark');
              document.documentElement.classList.remove('light');
            } else {
              document.documentElement.classList.add('light');
              document.documentElement.classList.remove('dark');
            }
          }
        } catch (err) {
          console.error('Session initialization failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      sessionStorage.setItem('biotrack_token', data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, role: string, department: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/signup', { email, password, name, role, department });
      sessionStorage.setItem('biotrack_token', data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('biotrack_token');
    setUser(null);
  };

  const updateUser = async (updates: Partial<User> & { password?: string }) => {
    const updatedProfile = await api.put('/auth/profile', updates);
    setUser(updatedProfile);
  };

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
