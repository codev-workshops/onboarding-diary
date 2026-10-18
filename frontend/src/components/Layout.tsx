import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from '../api/types';
import type { Role } from '../api/types';

interface NavItem {
  to: string;
  label: string;
}

const NAV: Record<Role, NavItem[]> = {
  RECRUIT: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/tasks', label: 'Tasks' },
    { to: '/issues', label: 'Issues' },
    { to: '/feedback', label: 'Feedback' },
    { to: '/notes', label: 'Notes' },
    { to: '/reports', label: 'Reports' },
  ],
  MANAGER: [
    { to: '/recruits', label: 'My Recruits' },
    { to: '/reports', label: 'Reports' },
  ],
  ADMIN: [
    { to: '/admin/users', label: 'Users' },
    { to: '/recruits', label: 'Recruits' },
    { to: '/reports', label: 'Reports' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
            Onboarding Diary
          </NavLink>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Toggle navigation</span>☰
          </button>
          <nav id="main-nav" className={`nav${open ? ' nav-open' : ''}`}>
            {NAV[user.role].map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            <span className="nav-spacer" />
            <NavLink to="/profile" onClick={() => setOpen(false)} title="Profile">
              {user.name} <span className="role-pill">{ROLE_LABELS[user.role]}</span>
            </NavLink>
            <button type="button" className="link-button" onClick={handleLogout}>
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
