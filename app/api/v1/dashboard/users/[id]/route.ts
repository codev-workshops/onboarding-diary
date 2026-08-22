import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { getUserDashboard } from '@/src/modules/dashboard/service';
import { parseQuery } from '@/src/modules/entries/schemas';
import { ok, route } from '@/src/shared/http/envelope';
import { resourceId, type IdContext } from '@/src/shared/http/resource-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One recruit's dashboard, behind the manager's team view. Scope is the
 * service's business, not the handler's: an id outside the caller's reports is
 * refused there, before a single aggregate runs.
 */
export const GET = route(async (request: Request, context: IdContext) => {
  const actor = await requireCurrentUser(request);
  const query = parseQuery(dashboardQuerySchema, request.url);
  return ok(await getUserDashboard(actor, await resourceId(context), query));
});
