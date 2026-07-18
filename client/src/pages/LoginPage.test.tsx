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

  it('shows demo credentials helper with provisioned accounts in demo mode', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/config/demo')) {
        return Promise.resolve(
          jsonResponse({
            password: 'Passw0rd!',
            departments: ['Engineering', 'Design'],
            accounts: [
              {
                email: 'admin@demo.local',
                name: 'Ada Admin',
                role: 'Admin',
                department: 'Engineering',
              },
              {
                email: 'recruit.rina@demo.local',
                name: 'Rina Recruit',
                role: 'Recruit',
                department: 'Engineering',
              },
            ],
          }),
        );
      }
      if (url.includes('/api/config')) {
        return Promise.resolve(
          jsonResponse({ demoMode: true, onboardingEnablersEnabled: true, datasource: 'demo' }),
        );
      }
      return Promise.resolve(jsonResponse({}, false, 404));
    });
    renderPage();
    expect(await screen.findByText(/pre-provisioned accounts/i)).toBeInTheDocument();
    expect(screen.getByText('admin@demo.local', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('recruit.rina@demo.local', { exact: false })).toBeInTheDocument();
  });

  it('does not fetch or show demo credentials when demo mode is off', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/config')) {
        return Promise.resolve(
          jsonResponse({ demoMode: false, onboardingEnablersEnabled: false, datasource: 'demo' }),
        );
      }
      return Promise.resolve(jsonResponse({}, false, 404));
    });
    renderPage();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText(/pre-provisioned accounts/i)).not.toBeInTheDocument();
    const demoCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/api/config/demo'));
    expect(demoCalls).toHaveLength(0);
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
