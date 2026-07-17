import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/auth/AuthContext';
import { LoginPage } from './LoginPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows demo credentials helper in demo mode', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ demoMode: true, onboardingEnablersEnabled: true, datasource: 'demo' }),
    );
    renderPage();
    expect(await screen.findByText(/Demo mode/i)).toBeInTheDocument();
    expect(screen.getByText('admin@demo.local')).toBeInTheDocument();
  });

  it('submits credentials and stores the token', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/config')) {
        return Promise.resolve(
          jsonResponse({ demoMode: false, onboardingEnablersEnabled: false, datasource: 'demo' }),
        );
      }
      if (url.includes('/api/auth/login')) {
        return Promise.resolve(
          jsonResponse({
            token: 'jwt-token',
            user: { id: '1', email: 'a@b.com', name: 'A', role: 'Admin' },
          }),
        );
      }
      return Promise.resolve(jsonResponse({}, false, 404));
    });

    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(localStorage.getItem('onboarding.token')).toBe('jwt-token'));
    expect(fetchMock).toHaveBeenCalled();
  });
});
