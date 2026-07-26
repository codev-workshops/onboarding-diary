import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '../../app/queryClient.js';
import { fakeClient, RECRUIT } from '../../test/fakeClient.js';
import { AuthProvider, useAuth } from './AuthContext.js';

function wrapper(client: ReturnType<typeof fakeClient>) {
  const queryClient = createQueryClient();
  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider client={client}>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe('AuthProvider', () => {
  it('restores a session from the refresh cookie on load', async () => {
    const client = fakeClient({ session: RECRUIT });
    const { result } = renderHook(useAuth, { wrapper: wrapper(client) });

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user?.fullName).toBe('Nadia Khan');
    expect(client.refresh).toHaveBeenCalledTimes(1);
  });

  it('settles as anonymous when there is no usable refresh cookie', async () => {
    const client = fakeClient();
    const { result } = renderHook(useAuth, { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(result.current.user).toBeNull();
  });

  it('keeps the access token in memory only, never in web storage', async () => {
    const client = fakeClient();
    client.post.mockResolvedValue({
      data: { user: RECRUIT, accessToken: 'access-1', accessTokenExpiresAt: 'later' },
    });
    const { result } = renderHook(useAuth, { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.status).toBe('anonymous'));

    await act(async () => {
      await result.current.login({ email: 'nadia@example.com', password: 'correct horse 42' });
    });

    expect(result.current.status).toBe('authenticated');
    expect(client.setAccessToken).toHaveBeenCalledWith('access-1');
    expect(JSON.stringify(localStorage)).not.toContain('access-1');
    expect(JSON.stringify(sessionStorage)).not.toContain('access-1');
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('clears the user and the token on logout, even if the request fails', async () => {
    const client = fakeClient({ session: RECRUIT });
    client.post.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useAuth, { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    await act(async () => {
      await result.current.logout().catch(() => undefined);
    });

    expect(result.current.status).toBe('anonymous');
    expect(result.current.user).toBeNull();
    expect(client.setAccessToken).toHaveBeenCalledWith(null);
  });
});
