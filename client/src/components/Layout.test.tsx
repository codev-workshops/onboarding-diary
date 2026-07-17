import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CurrentUser } from '@/lib/types';
import { Layout } from './Layout';

const logout = vi.fn();
const authState: { user: CurrentUser | null } = { user: null };

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, logout, login: vi.fn(), loading: false }),
}));

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function renderLayout(role: CurrentUser['role']) {
  authState.user = { id: 'u1', email: 'u@x', name: 'Uma', role, timezone: 'UTC' };
  vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ items: [], unread: 0 }));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/tasks']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/tasks" element={<div>outlet-content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  logout.mockClear();
  document.documentElement.classList.remove('dark');
});

describe('Layout', () => {
  it('renders the admin nav, outlet, and toggles theme + logout', async () => {
    renderLayout('Admin');
    expect(screen.getByText('outlet-content')).toBeInTheDocument();
    expect(screen.getByText('Uma · Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Toggle theme'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await userEvent.click(screen.getByLabelText('Log out'));
    expect(logout).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByLabelText('Toggle navigation'));
  });

  it('hides the admin nav item for a recruit and shows their landing', () => {
    renderLayout('Recruit');
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('keeps the sidebar visible on scroll via a sticky, full-height nav on desktop', () => {
    renderLayout('Recruit');
    const nav = screen.getByRole('navigation');
    // Sticky + full viewport height so long pages never leave the sidebar column empty.
    expect(nav.className).toContain('md:sticky');
    expect(nav.className).toContain('md:top-14');
    expect(nav.className).toContain('md:h-[calc(100vh-3.5rem)]');
  });

  it('marks the active nav item with a non-color cue (weight + accent + aria-current)', () => {
    renderLayout('Recruit');
    // Rendered at /tasks, so the Tasks link is the active route.
    const active = screen.getByRole('link', { name: 'Tasks' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).toContain('font-semibold');
    expect(active.className).toContain('border-primary');

    const inactive = screen.getByRole('link', { name: 'Dashboard' });
    expect(inactive).not.toHaveAttribute('aria-current');
    expect(inactive.className).toContain('font-medium');
  });
});
