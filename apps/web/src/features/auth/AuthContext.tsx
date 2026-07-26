/**
 * Session state (T-112). The access token lives in memory only — never in `localStorage`
 * or `sessionStorage` — because the refresh cookie is the durable half of the session and
 * an in-memory token cannot be read by injected script (TRD 5).
 */

import type { AuthTokensDto, LoginBody, SignupBody, UserDto } from '@onboarding-diary/shared';
import type { DataEnvelope } from '@onboarding-diary/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ApiClient } from '../../lib/apiClient.js';
import { queryKeys } from '../../app/queryKeys.js';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export type AuthContextValue = {
  status: AuthStatus;
  user: UserDto | null;
  /** Keeps the header and guards in step after the user edits their own profile. */
  setUser: (user: UserDto) => void;
  login: (credentials: LoginBody) => Promise<UserDto>;
  signup: (input: SignupBody) => Promise<UserDto>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionResponse = DataEnvelope<{ user: UserDto } & AuthTokensDto>;

export function AuthProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}): ReactNode {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserDto | null>(null);

  // A page load has no access token, so the refresh cookie decides whether a session
  // survives a reload.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const refreshed = await client.refresh().catch(() => false);
      if (cancelled) return;
      if (!refreshed) {
        setStatus('anonymous');
        return;
      }
      try {
        const me = await client.get<DataEnvelope<UserDto>>('/auth/me');
        if (cancelled) return;
        setUser(me.data);
        setStatus('authenticated');
      } catch {
        if (!cancelled) setStatus('anonymous');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const start = useCallback(
    async (path: '/auth/login' | '/auth/signup', body: LoginBody | SignupBody) => {
      const response = await client.post<SessionResponse>(path, body, {
        retryOnUnauthenticated: false,
      });
      client.setAccessToken(response.data.accessToken);
      setUser(response.data.user);
      setStatus('authenticated');
      queryClient.setQueryData(queryKeys.me, response.data.user);
      return response.data.user;
    },
    [client, queryClient],
  );

  const login = useCallback((credentials: LoginBody) => start('/auth/login', credentials), [start]);
  const signup = useCallback((input: SignupBody) => start('/auth/signup', input), [start]);

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout', undefined, { retryOnUnauthenticated: false });
    } finally {
      client.setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    }
  }, [client, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, setUser, login, signup, logout }),
    [status, user, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside an AuthProvider');
  return value;
}
