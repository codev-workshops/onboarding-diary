import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { getTeamDashboard } from '@/src/modules/dashboard/service';
import { parseQuery } from '@/src/modules/entries/schemas';
import { ok, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Rollup over in-scope recruits; the service refuses a recruit outright. */
export const GET = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const query = parseQuery(dashboardQuerySchema, request.url);
  return ok(await getTeamDashboard(actor, query));
});
