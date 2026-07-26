/**
 * App shell (T-110). The navigation collapses to a horizontally scrollable strip on narrow
 * viewports so the shell stays usable at 360 px; the role-aware navigation and the user
 * menu arrive with T-123.
 */

import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/issues', label: 'Issues' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/notes', label: 'Notes' },
  { to: '/reports', label: 'Reports' },
] as const;

export function AppLayout(): ReactNode {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-base font-semibold">Onboarding Diary</span>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-5xl px-4">
          <ul className="flex gap-1 overflow-x-auto pb-2">
            {NAV_ITEMS.map((item) => (
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
