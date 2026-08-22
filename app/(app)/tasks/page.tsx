import type { Metadata } from 'next';

import { TaskWorkspace } from '@/components/tasks/task-workspace';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { listTasksSchema } from '@/src/modules/tasks/schemas';
import { listTasks } from '@/src/modules/tasks/service';

export const metadata: Metadata = { title: 'Tasks | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Filters live in the URL, so the first paint is server-rendered and already
 * filtered — no spinner on load, and a filtered view is a shareable link. The
 * page calls the same service the API does, so the rows it renders are scoped
 * by the same predicate; there is no "trusted" server-render path.
 */
export default async function TasksPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const raw = await searchParams;

  const parsed = listTasksSchema.safeParse(
    Object.fromEntries(
      Object.entries(raw).filter(([, value]) => typeof value === 'string' && value.length > 0)
    )
  );

  // An unparsable query string is a stale or hand-edited link, not an attack
  // worth an error page; fall back to the default view.
  const query = parsed.success ? parsed.data : listTasksSchema.parse({});
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
