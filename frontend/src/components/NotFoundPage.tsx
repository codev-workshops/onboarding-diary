import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link to="/" className="mt-2 inline-block text-sm text-slate-600 underline">
        Back to the dashboard
      </Link>
    </section>
  );
}
