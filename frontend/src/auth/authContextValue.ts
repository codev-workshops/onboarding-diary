import { createContext } from 'react';
import type { Role, SignupRequest, User } from '../api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (request: SignupRequest) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
