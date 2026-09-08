import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getProfile, type AuthResponse, type UserProfile } from '../api/auth';
import { setAccessToken, setUnauthorizedHandler } from '../api/client';
import { AuthContext, type AuthContextValue } from './auth-context';

/**
 * The access token lives in memory and is mirrored into `sessionStorage` so a page refresh does
 * not sign the user out (ADR-006). `sessionStorage` is readable by scripts on this origin, which
 * is the accepted trade-off for bearer transport; the token expires after 60 minutes.
 */
const TOKEN_KEY = 'onboarding-diary.access-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));

  setAccessToken(token);

  const signIn = useCallback(
    (auth: AuthResponse) => {
      sessionStorage.setItem(TOKEN_KEY, auth.accessToken);
      setAccessToken(auth.accessToken);
      setToken(auth.accessToken);
      queryClient.setQueryData(['me'], auth.user);
    },
    [queryClient]
  );

  const signOut = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const profile = useQuery({
    queryKey: ['me'],
    queryFn: getProfile,
    enabled: token !== null,
    retry: false,
  });

  const setUser = useCallback(
    (user: UserProfile) => queryClient.setQueryData(['me'], user),
    [queryClient]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: token === null ? null : (profile.data ?? null),
      isLoading: token !== null && profile.isPending,
      signIn,
      signOut,
      setUser,
    }),
    [token, profile.data, profile.isPending, signIn, signOut, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
