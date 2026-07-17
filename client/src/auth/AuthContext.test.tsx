import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { getToken, setToken } from '@/lib/api';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

const me = { id: 'u1', email: 'u@x', name: 'U', role: 'Admin', timezone: 'UTC' };

function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="state">{loading ? 'loading' : (user?.email ?? 'anon')}</span>
      <button onClick={() => void login('u@x', 'pw')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  setToken(null);
});

describe('AuthProvider', () => {
  it('stays anonymous when there is no token', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anon'));
  });

  it('bootstraps the current user from a stored token', async () => {
    setToken('t');
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(me));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('u@x'));
  });

  it('clears an invalid token on a failed bootstrap', async () => {
    setToken('bad');
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ error: { message: 'x' } }, false, 401));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anon'));
    expect(getToken()).toBeNull();
  });

  it('logs in and out, persisting and clearing the token', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse({ token: 'tok', user: me }));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anon'));

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('u@x'));
    expect(getToken()).toBe('tok');
    expect(fetchMock).toHaveBeenCalled();

    await userEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anon'));
    expect(getToken()).toBeNull();
  });
});
