import React, { createContext, useContext, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { Plant } from '../constants/plants';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  plant: Plant | null;
  selectPlant: (plant: Plant) => void;
  clearPlant: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [isLoading] = useState(false);

  const selectPlant = (selectedPlant: Plant) => {
    setPlant(selectedPlant);
  };

  const clearPlant = () => {
    setPlant(null);
    setUser(null);
    setToken(null);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    if (!plant) {
      console.error('Login attempted without plant selection');
      return false;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, plant }),
      });

      const data = await response.json();

      if (data.success && data.user && data.token) {
        setUser(data.user);
        setToken(data.token);
        return true;
      } else {
        console.error('Login failed:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPlant(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, plant, selectPlant, clearPlant, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
