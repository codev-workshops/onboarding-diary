import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header>
        <span className="brand">Onboarding Diary</span>
        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/issues">Issues</NavLink>
          <NavLink to="/feedback">Feedback</NavLink>
          <NavLink to="/notes">Notes</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          {user?.role === 'Manager' && <NavLink to="/team">Team</NavLink>}
          {user?.role === 'Admin' && <NavLink to="/admin/users">Users</NavLink>}
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <div className="user-menu">
          <span className="muted">
            {user?.fullName} ({user?.role})
          </span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
