import { createContext } from 'react';

export interface AuthContextType {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
