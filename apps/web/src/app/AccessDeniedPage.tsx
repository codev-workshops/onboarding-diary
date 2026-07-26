/**
 * The one 403 screen (T-190). It is rendered both by the role guard and by any query that comes
 * back 403, so a forbidden route and a forbidden resource read identically (TRD 6.4).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AccessDenied({ description }: { description?: string }): ReactNode {
  return (
    <div className="mx-auto max-w-lg py-16 text-center" role="alert">
      <h1 className="text-2xl font-semibold text-slate-900">You do not have access to this</h1>
      <p className="mt-2 text-slate-600">
        {description ??
          'Your account does not have permission to view this page. Ask an administrator if you believe this is wrong.'}
      </p>
      <Link className="mt-6 inline-block text-sky-700 underline" to="/">
        Back to your dashboard
      </Link>
    </div>
  );
}

export function AccessDeniedPage(): ReactNode {
  return <AccessDenied />;
}
