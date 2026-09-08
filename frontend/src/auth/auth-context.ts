import { createContext, useContext } from 'react';
import type { AuthResponse, UserProfile } from '../api/auth';

export interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
  setUser: (user: UserProfile) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}
