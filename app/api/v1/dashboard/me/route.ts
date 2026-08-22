import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { getUserDashboard } from '@/src/modules/dashboard/service';
import { parseQuery } from '@/src/modules/entries/schemas';
import { ok, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Own summary. The actor is the subject; there is no `user_id` to spoof. */
export const GET = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const query = parseQuery(dashboardQuerySchema, request.url);
  return ok(await getUserDashboard(actor, actor.id, query));
});
