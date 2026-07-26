import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage(): ReactNode {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-sm font-semibold tracking-wide text-sky-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you asked for does not exist.</p>
      <Link className="mt-6 inline-block text-sky-700 underline" to="/">
        Back to your dashboard
      </Link>
    </div>
  );
}
