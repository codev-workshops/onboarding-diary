import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function TopBar() {
  const { logout } = useAuth();
  return (
    <header className="topbar">
      <span className="brand">Onboarding Diary</span>
      <nav className="nav">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Dashboard
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Analytics
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Tasks
        </NavLink>
        <NavLink to="/issues" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Issues
        </NavLink>
        <NavLink to="/feedback" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Feedback
        </NavLink>
        <NavLink to="/notes" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Notes
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Reports
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Search
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Profile
        </NavLink>
      </nav>
      <button type="button" className="link" onClick={logout}>
        Sign out
      </button>
    </header>
  );
}
