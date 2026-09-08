import { useQuery } from '@tanstack/react-query';
import { getTrends } from '../../api/tasks';
import { ErrorState, LoadingState } from '../ListState';
import { EntriesPerDayChart } from './EntriesPerDayChart';
import { IssueTrendChart } from './IssueTrendChart';
import { TaskCompletionChart } from './TaskCompletionChart';

/**
 * Read-only activity charts for one recruit: the trends endpoint drives the two per-day charts,
 * the dashboard's own counts drive the completion chart.
 */
export function ActivitySection({
  userId,
  tasks,
}: {
  userId?: number;
  tasks: { total: number; done: number; open: number };
}) {
  const query = useQuery({
    queryKey: ['dashboard', 'trends', userId ?? 'me'],
    queryFn: () => getTrends(userId),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold">Activity</h2>
      {query.isPending ? (
        <LoadingState label="Loading activity…" />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          fallback="Could not load activity. Try again."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <EntriesPerDayChart days={query.data.days} />
          <IssueTrendChart days={query.data.days} />
          <TaskCompletionChart total={tasks.total} done={tasks.done} open={tasks.open} />
        </div>
      )}
    </div>
  );
}
