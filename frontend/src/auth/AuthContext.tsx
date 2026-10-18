import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError, onUnauthorized } from '../api/client';
import type { User } from '../api/types';

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  department: string;
  startDate: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    api
      .get<User>('/api/auth/me')
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) {
          console.error(e);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      setUser((current) => {
        if (current) {
          setSessionExpired(true);
        }
        return null;
      });
    });
    return () => onUnauthorized(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await api.post<User>('/api/auth/login', { email, password });
    setSessionExpired(false);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const created = await api.post<User>('/api/auth/signup', input);
    setSessionExpired(false);
    setUser(created);
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post<void>('/api/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, signup, logout, setUser }),
    [user, loading, sessionExpired, login, signup, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

export function homePathFor(user: User): string {
  switch (user.role) {
    case 'ADMIN':
      return '/admin/users';
    case 'MANAGER':
      return '/team';
    default:
      return '/dashboard';
  }
}
