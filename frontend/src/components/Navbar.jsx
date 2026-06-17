import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Onboarding Diary
      </Link>
      <div className="navbar-links">
        <Link to="/">Dashboard</Link>
      </div>
    </nav>
  );
}

export default Navbar;
