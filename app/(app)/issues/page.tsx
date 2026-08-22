import type { Metadata } from 'next';

import { IssueWorkspace } from '@/components/issues/issue-workspace';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { parseSearchParams } from '@/src/modules/entries/schemas';
import { listIssuesSchema } from '@/src/modules/issues/schemas';
import { listIssues } from '@/src/modules/issues/service';

export const metadata: Metadata = { title: 'Issues | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The page calls the same service the API does, so the rows it renders are
 * scoped by the same predicate — there is no privileged server-render path.
 * An unparsable query string falls back to the default view rather than an
 * error page: it is a stale link, not an attack.
 */
export default async function IssuesPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const query = parseSearchParams(listIssuesSchema, await searchParams);
  const result = await listIssues(actor, query);

  return (
    <IssueWorkspace
      actorId={actor.id}
      canFilterByOwner={actor.role !== 'RECRUIT'}
      canTriage={actor.role !== 'RECRUIT'}
      page={result.page}
      issues={result.items}
    />
  );
}
