/**
 * App shell (T-110/T-123). Navigation is role-aware — team views need a manager, user
 * management an admin — and the strip scrolls horizontally so the shell stays usable at
 * 360 px.
 */

import { ROLE_LABELS, type Role } from '@onboarding-diary/shared';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button.js';
import { useAuth } from '../features/auth/AuthContext.js';

type NavItem = { to: string; label: string; allow?: readonly Role[] };

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/issues', label: 'Issues' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/notes', label: 'Notes' },
  { to: '/reports', label: 'Reports' },
  { to: '/team', label: 'Team', allow: ['MANAGER', 'ADMIN'] },
  { to: '/admin', label: 'Admin', allow: ['ADMIN'] },
];

export function visibleNavItems(role: Role | undefined): readonly NavItem[] {
  if (role === undefined) return [];
  return NAV_ITEMS.filter((item) => item.allow === undefined || item.allow.includes(role));
}

export function AppLayout(): ReactNode {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout(): Promise<void> {
    await logout();
    void navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-base font-semibold">Onboarding Diary</span>
          <div className="flex items-center gap-3">
            {user === null ? null : (
              <NavLink className="text-sm text-slate-700 hover:underline" to="/profile">
                {user.fullName}
                <span className="ml-2 text-xs text-slate-500">{ROLE_LABELS[user.role]}</span>
              </NavLink>
            )}
            <Button variant="secondary" onClick={() => void onLogout()}>
              Log out
            </Button>
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-5xl px-4">
          <ul className="flex gap-1 overflow-x-auto pb-2">
            {visibleNavItems(user?.role).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'block rounded-md px-3 py-2 text-sm whitespace-nowrap',
                      isActive
                        ? 'bg-sky-100 font-medium text-sky-900'
                        : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
