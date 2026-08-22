import type { Metadata } from 'next';

import { TaskWorkspace } from '@/components/tasks/task-workspace';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { parseSearchParams } from '@/src/modules/entries/schemas';
import { listTasksSchema } from '@/src/modules/tasks/schemas';
import { listTasks } from '@/src/modules/tasks/service';

export const metadata: Metadata = { title: 'Tasks | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Filters live in the URL, so the first paint is server-rendered and already
 * filtered — no spinner on load, and a filtered view is a shareable link. The
 * page calls the same service the API does, so the rows it renders are scoped
 * by the same predicate; there is no "trusted" server-render path. An
 * unparsable query string falls back to the default view rather than an error
 * page: it is a stale or hand-edited link, not an attack.
 */
export default async function TasksPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const query = parseSearchParams(listTasksSchema, await searchParams);
  const result = await listTasks(actor, query);

  return (
    <TaskWorkspace
      actorId={actor.id}
      canFilterByOwner={actor.role !== 'RECRUIT'}
      page={result.page}
      tasks={result.items}
    />
  );
}
