import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard" className="navbar-title">Onboarding Diary</Link>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          &#9776;
        </button>
      </div>
      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        {user?.role === 'RECRUIT' && (
          <>
            <Link to="/tasks" onClick={() => setMenuOpen(false)}>Tasks</Link>
            <Link to="/issues" onClick={() => setMenuOpen(false)}>Issues</Link>
            <Link to="/feedback" onClick={() => setMenuOpen(false)}>Feedback</Link>
            <Link to="/notes" onClick={() => setMenuOpen(false)}>Notes</Link>
          </>
        )}
        {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
          <Link to="/reports" onClick={() => setMenuOpen(false)}>Reports</Link>
        )}
        {user?.role === 'ADMIN' && (
          <>
            <Link to="/admin/users" onClick={() => setMenuOpen(false)}>Users</Link>
            <Link to="/admin/assignments" onClick={() => setMenuOpen(false)}>Assignments</Link>
          </>
        )}
      </div>
      <div className="navbar-user">
        <span className="user-name">{user?.name}</span>
        <span className="user-role badge">{user?.role}</span>
        <button className="btn btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
