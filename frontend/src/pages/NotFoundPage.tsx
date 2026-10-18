import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="empty-page">
      <h1>Not found</h1>
      <p>The page or item you are looking for does not exist.</p>
      <Link to="/">Go to home</Link>
    </div>
  );
}
