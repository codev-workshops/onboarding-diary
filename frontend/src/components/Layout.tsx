import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Layout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <nav className="navbar">
        <Link to="/" className="nav-brand">Onboarding Diary</Link>
        <div className="nav-links">
          <Link to="/entries">Entries</Link>
          <Link to="/settings/social">Settings</Link>
          <span className="nav-user">{username}</span>
          <button onClick={handleLogout} className="btn btn-sm">Logout</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
