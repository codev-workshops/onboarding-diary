import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { CurrentUser } from '@/lib/types';
import { App } from './App';

const authState: { user: CurrentUser | null; loading: boolean } = { user: null, loading: false };

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ ...authState, login: vi.fn(), logout: vi.fn() }),
}));
vi.mock('@/onboarding/Tour', () => ({ Tour: () => null }));
vi.mock('@/components/Layout', async () => {
  const rr = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  const Outlet = rr.Outlet;
  return { Layout: () => <Outlet /> };
});
vi.mock('@/pages/DashboardPage', () => ({ DashboardPage: () => <div>dashboard-page</div> }));
vi.mock('@/pages/TeamPage', () => ({ TeamPage: () => <div>team-page</div> }));
vi.mock('@/pages/OverviewPage', () => ({ OverviewPage: () => <div>overview-page</div> }));
vi.mock('@/pages/AdminPage', () => ({ AdminPage: () => <div>admin-page</div> }));
vi.mock('@/pages/TasksPage', () => ({ TasksPage: () => <div>tasks-page</div> }));
vi.mock('@/pages/IssuesPage', () => ({ IssuesPage: () => <div>issues-page</div> }));
vi.mock('@/pages/FeedbackPage', () => ({ FeedbackPage: () => <div>feedback-page</div> }));
vi.mock('@/pages/NotesPage', () => ({ NotesPage: () => <div>notes-page</div> }));
vi.mock('@/pages/ReportsPage', () => ({ ReportsPage: () => <div>reports-page</div> }));
vi.mock('@/pages/LoginPage', () => ({ LoginPage: () => <div>login-page</div> }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function setUser(role: CurrentUser['role'] | null) {
  authState.user = role
    ? { id: 'u1', email: 'u@x', name: 'U', role, timezone: 'UTC' }
    : null;
  authState.loading = false;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App routing', () => {
  it('shows a loading state while auth bootstraps', () => {
    authState.loading = true;
    renderAt('/dashboard');
    expect(screen.getByRole('status')).toHaveTextContent('Loading Onboarding Diary');
  });

  it('redirects unauthenticated users to the login page', () => {
    setUser(null);
    renderAt('/dashboard');
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('lands a recruit on the dashboard and blocks admin-only routes', () => {
    setUser('Recruit');
    const { unmount } = renderAt('/dashboard');
    expect(screen.getByText('dashboard-page')).toBeInTheDocument();
    unmount();

    setUser('Recruit');
    renderAt('/overview');
    // redirected back to the recruit's own landing
    expect(screen.getByText('dashboard-page')).toBeInTheDocument();
  });

  it('routes managers and admins to their landings', () => {
    setUser('Manager');
    const { unmount } = renderAt('/team');
    expect(screen.getByText('team-page')).toBeInTheDocument();
    unmount();

    setUser('Admin');
    renderAt('/admin');
    expect(screen.getByText('admin-page')).toBeInTheDocument();
  });
});
