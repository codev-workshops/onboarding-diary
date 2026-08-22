import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { createNoteSchema, parseListQuery } from '@/src/modules/notes/schemas';
import { createNote, listNotes } from '@/src/modules/notes/service';
import { ok, readJson, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handlers stay this thin on purpose: resolve the actor from the session,
 * validate, delegate. There is no scope check here because there is nowhere to
 * put one — the repository refuses to query without it.
 */
export const GET = route(async (request) => {
  const actor = await requireCurrentUser(request);
  return ok(await listNotes(actor, parseListQuery(request.url)));
});

export const POST = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const body = await readJson(request, createNoteSchema);
  return ok(await createNote(actor, body), { status: 201 });
});
