import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="empty-page">
      <h1>Access denied</h1>
      <p>You do not have permission to view this page.</p>
      <Link to="/">Go to home</Link>
    </div>
  );
}
