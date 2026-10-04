import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as authApi from '../api/auth';
import * as client from '../api/client';
import { recruit } from '../test/fixtures';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';

vi.mock('../api/auth', () => ({ logout: vi.fn(), login: vi.fn(), fetchCurrentUser: vi.fn() }));
vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  refreshAccessToken: vi.fn(),
}));

function Controls() {
  const { status, login, logout } = useAuth();
  return (
    <>
      <span>{status}</span>
      <button onClick={() => login('asha@example.com', 'Secret123')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </>
  );
}

describe('AuthProvider', () => {
  it('drops cached diary data when the session changes', async () => {
    vi.mocked(client.refreshAccessToken).mockResolvedValue(null);
    vi.mocked(authApi.logout).mockResolvedValue();
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'token',
      expiresIn: 900,
      user: recruit,
    });
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Controls />
        </AuthProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('anonymous')).toBeInTheDocument();

    queryClient.setQueryData(['tasks', 99, {}], { content: ['previous user'] });
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    await screen.findByText('authenticated');
    expect(queryClient.getQueryData(['tasks', 99, {}])).toBeUndefined();

    queryClient.setQueryData(['notes', 1, {}], { content: ['mine'] });
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(queryClient.getQueryData(['notes', 1, {}])).toBeUndefined());
  });
});
