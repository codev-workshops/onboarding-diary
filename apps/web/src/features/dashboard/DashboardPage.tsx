import type { ReactNode } from 'react';

import { ErrorState, Skeleton } from '../../components/ui/states.js';
import { useAuth } from '../auth/AuthContext.js';
import { DashboardView } from './DashboardView.js';
import { useDashboard } from './useDashboard.js';

export function DashboardPage(): ReactNode {
  const { user } = useAuth();
  const query = useDashboard();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">
        {user === null ? 'Dashboard' : `Welcome, ${user.fullName.split(' ')[0]}`}
      </h1>
      {query.isPending ? (
        <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <DashboardView dashboard={query.data} />
      )}
    </section>
  );
}
