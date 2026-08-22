import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { createIssueSchema, parseListQuery } from '@/src/modules/issues/schemas';
import { createIssue, listIssues } from '@/src/modules/issues/service';
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
  return ok(await listIssues(actor, parseListQuery(request.url)));
});

export const POST = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const body = await readJson(request, createIssueSchema);
  return ok(await createIssue(actor, body), { status: 201 });
});
