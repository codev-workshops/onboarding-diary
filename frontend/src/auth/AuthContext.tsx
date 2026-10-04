import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { refreshAccessToken, setAccessToken, setSessionExpiredHandler } from '../api/client';
import type { Role, SignupRequest, User } from '../api/types';
import { AuthContext, type AuthStatus } from './authContextValue';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    setAccessToken(null);
    queryClient.clear();
    setUserState(null);
    setStatus('anonymous');
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    let cancelled = false;
    refreshAccessToken()
      .then((token) => (token ? authApi.fetchCurrentUser() : null))
      .then((current) => {
        if (cancelled) return;
        setUserState(current);
        setStatus(current ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (!cancelled) clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const startSession = useCallback(
    (accessToken: string, sessionUser: User) => {
      setAccessToken(accessToken);
      queryClient.clear();
      setUserState(sessionUser);
      setStatus('authenticated');
      return sessionUser;
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password);
      return startSession(response.accessToken, response.user);
    },
    [startSession],
  );

  const signup = useCallback(
    async (request: SignupRequest) => {
      const response = await authApi.signup(request);
      return startSession(response.accessToken, response.user);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const setUser = useCallback((updated: User) => setUserState(updated), []);

  const hasRole = useCallback(
    (...roles: Role[]) => !!user && roles.some((role) => user.roles.includes(role)),
    [user],
  );

  const value = useMemo(
    () => ({ status, user, login, signup, logout, setUser, hasRole }),
    [status, user, login, signup, logout, setUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
