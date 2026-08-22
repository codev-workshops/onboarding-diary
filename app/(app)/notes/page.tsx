import type { Metadata } from 'next';

import { NoteWorkspace } from '@/components/notes/note-workspace';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { parseSearchParams } from '@/src/modules/entries/schemas';
import { listNotesSchema } from '@/src/modules/notes/schemas';
import { listNotes } from '@/src/modules/notes/service';

export const metadata: Metadata = { title: 'Notes | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The page calls the same service the API does, so the rows it renders are
 * scoped by the same predicate — there is no privileged server-render path.
 * An unparsable query string falls back to the default view rather than an
 * error page: it is a stale link, not an attack.
 */
export default async function NotesPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const query = parseSearchParams(listNotesSchema, await searchParams);
  const result = await listNotes(actor, query);

  return (
    <NoteWorkspace
      actorId={actor.id}
      canFilterByOwner={actor.role !== 'RECRUIT'}
      page={result.page}
      notes={result.items}
    />
  );
}
