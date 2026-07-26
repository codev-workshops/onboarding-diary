import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Centred card shared by login and signup so the two screens stay visually identical. */
export function AuthCard({
  title,
  error,
  footer,
  children,
}: {
  title: string;
  error?: string | undefined;
  footer: { prompt: string; to: string; label: string };
  children: ReactNode;
}): ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {error === undefined ? null : (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        <div className="mt-4">{children}</div>
        <p className="mt-6 text-sm text-slate-600">
          {footer.prompt}{' '}
          <Link className="font-medium text-sky-700 underline" to={footer.to}>
            {footer.label}
          </Link>
        </p>
      </div>
    </div>
  );
}
