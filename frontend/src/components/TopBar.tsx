import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function TopBar() {
  const { logout } = useAuth();
  return (
    <header className="topbar">
      <span className="brand">Onboarding Diary</span>
      <nav className="nav">
        <NavLink to="/tasks" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Tasks
        </NavLink>
        <NavLink to="/issues" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Issues
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
