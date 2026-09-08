import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/issues', label: 'Issues' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/notes', label: 'Notes' },
  { to: '/reports', label: 'Reports' },
];

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
      </header>

      <div className="md:flex">
        <nav
          id="primary-navigation"
          className={`${navOpen ? 'block' : 'hidden'} border-b border-slate-200 bg-white p-3 md:block md:w-56 md:shrink-0 md:border-r md:border-b-0`}
        >
          <ul className="space-y-1">
            {navItems.map((item) => (
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

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
