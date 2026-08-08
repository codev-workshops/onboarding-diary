import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from './Button';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks', label: 'Task log' },
  { to: '/issues', label: 'Issue log' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/notes', label: 'Notes' },
  { to: '/search', label: 'Search' },
  { to: '/reports', label: 'Reports' },
  { to: '/profile', label: 'Profile' },
  { to: '/style-guide', label: 'Style guide' },
] as const;

export const AppShell = () => {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div>
          <p className="shell__brand">Onboarding Diary</p>
          <p className="shell__brandSub">Document your onboarding journey</p>
        </div>
        <nav className="shell__nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                ['shell__navLink', isActive ? 'shell__navLink--active' : '']
                  .filter(Boolean)
                  .join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shell__footer">
          <p className="shell__user">{user?.name}</p>
          <p className="shell__brandSub">
            {user?.role} · {user?.department || 'No department'}
          </p>
          {/* Secondary is only valid on a primary-colored surface — this sidebar. */}
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
};
