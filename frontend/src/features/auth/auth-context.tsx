import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { tokenStorage } from '../../shared/api/api-client';
import type { AuthResponse, User, UserRole } from '../../shared/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  signIn: (response: AuthResponse) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  const raw = localStorage.getItem(tokenStorage.userKey);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (tokenStorage.get() ? readStoredUser() : null));

  const signIn = useCallback((response: AuthResponse) => {
    tokenStorage.set(response.token);
    localStorage.setItem(tokenStorage.userKey, JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const signOut = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && tokenStorage.get()),
      hasRole: (roles: UserRole[]) => Boolean(user && roles.includes(user.role)),
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}
