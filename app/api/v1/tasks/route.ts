import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { createTaskSchema, parseListQuery } from '@/src/modules/tasks/schemas';
import { createTask, listTasks } from '@/src/modules/tasks/service';
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
  return ok(await listTasks(actor, parseListQuery(request.url)));
});

export const POST = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const body = await readJson(request, createTaskSchema);
  return ok(await createTask(actor, body), { status: 201 });
});
