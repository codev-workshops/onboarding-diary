import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AuthProvider } from '@/context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn().mockRejectedValue(new Error('no token')),
    logout: vi.fn(),
  },
}));

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form', () => {
    renderLogin();
    expect(screen.getByText('Onboarding Diary')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows validation errors for empty submission', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      const errors = screen.getAllByText(/invalid|required/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('shows error on failed login', async () => {
    const { authApi } = await import('@/api/auth.api');
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid'));

    renderLogin();
    await userEvent.type(screen.getByLabelText('Email'), 'user@test.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('navigates to dashboard on successful login', async () => {
    const { authApi } = await import('@/api/auth.api');
    vi.mocked(authApi.login).mockResolvedValue({
      tokens: { access_token: 'at', refresh_token: 'rt', expires_in: 900 },
      data: { id: '1', email: 'u@t.com', first_name: 'U', last_name: 'T', role: 'RECRUIT' },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText('Email'), 'u@t.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('has link to register page', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: 'Sign up' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });
});
