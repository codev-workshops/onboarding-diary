import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Role } from '@onboarding-diary/shared';
import { authApi } from '@/api/auth.api';

interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: AuthUser }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    department?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    authApi
      .refresh(refreshToken)
      .then((res) => {
        localStorage.setItem('access_token', res.tokens.access_token);
        localStorage.setItem('refresh_token', res.tokens.refresh_token);
        // We need the user info — decode from token or store separately
        const stored = localStorage.getItem('user');
        if (stored) {
          dispatch({ type: 'SET_USER', payload: JSON.parse(stored) });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      })
      .catch(() => {
        localStorage.clear();
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('access_token', res.tokens.access_token);
    localStorage.setItem('refresh_token', res.tokens.refresh_token);
    localStorage.setItem('user', JSON.stringify(res.data));
    dispatch({ type: 'SET_USER', payload: res.data as AuthUser });
  };

  const register = async (input: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    department?: string;
  }) => {
    const res = await authApi.register(input);
    localStorage.setItem('access_token', res.tokens.access_token);
    localStorage.setItem('refresh_token', res.tokens.refresh_token);
    localStorage.setItem('user', JSON.stringify(res.data));
    dispatch({ type: 'SET_USER', payload: res.data as AuthUser });
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    localStorage.clear();
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
