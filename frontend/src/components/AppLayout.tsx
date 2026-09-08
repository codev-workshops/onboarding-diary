import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import type { UserRole } from '../api/auth';
import { useAuth } from '../auth/auth-context';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tasks', label: 'Tasks', roles: ['Recruit'] },
  { to: '/issues', label: 'Issues', roles: ['Recruit'] },
  { to: '/feedback', label: 'Feedback', roles: ['Recruit'] },
  { to: '/notes', label: 'Notes', roles: ['Recruit'] },
  { to: '/team', label: 'Team', roles: ['Manager', 'Admin'] },
  { to: '/admin/users', label: 'Users', roles: ['Admin'] },
  { to: '/reports', label: 'Reports' },
  { to: '/profile', label: 'Profile' },
];

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const { user, signOut } = useAuth();
  const visibleNavItems = navItems.filter(
    (item) => item.roles === undefined || (user !== null && item.roles.includes(user.role))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-2 py-1 text-sm md:hidden"
          aria-expanded={navOpen}
          aria-controls="primary-navigation"
          onClick={() => setNavOpen((open) => !open)}
        >
          Menu
        </button>
        <span className="font-semibold">Onboarding Diary</span>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-slate-600 sm:inline">{user?.email}</span>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="md:flex">
        <nav
          id="primary-navigation"
          aria-label="Primary"
          className={`${navOpen ? 'block' : 'hidden'} border-b border-slate-200 bg-white p-3 md:block md:w-56 md:shrink-0 md:border-r md:border-b-0`}
        >
          <ul className="space-y-1">
            {visibleNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${
                      isActive ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main-content" className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
