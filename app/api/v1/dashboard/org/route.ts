import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { getOrgDashboard } from '@/src/modules/dashboard/service';
import { parseQuery } from '@/src/modules/entries/schemas';
import { ok, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Org-wide summary, admin only. */
export const GET = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const query = parseQuery(dashboardQuerySchema, request.url);
  return ok(await getOrgDashboard(actor, query));
});
