import type { Metadata } from 'next';

import { FeedbackWorkspace } from '@/components/feedback/feedback-workspace';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { parseSearchParams } from '@/src/modules/entries/schemas';
import { listFeedbackSchema } from '@/src/modules/feedback/schemas';
import { listFeedback } from '@/src/modules/feedback/service';

export const metadata: Metadata = { title: 'Feedback | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The page calls the same service the API does, so the rows it renders are
 * scoped by the same predicate — there is no privileged server-render path.
 * An unparsable query string falls back to the default view rather than an
 * error page: it is a stale link, not an attack.
 */
export default async function FeedbackPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const query = parseSearchParams(listFeedbackSchema, await searchParams);
  const result = await listFeedback(actor, query);

  return (
    <FeedbackWorkspace
      actorId={actor.id}
      canFilterByOwner={actor.role !== 'RECRUIT'}
      page={result.page}
      feedback={result.items}
    />
  );
}
