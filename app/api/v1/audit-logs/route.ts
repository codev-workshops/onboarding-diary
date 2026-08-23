import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { listAuditLogs } from '@/src/modules/audit/query-service';
import { auditLogQuerySchema } from '@/src/modules/audit/schemas';
import { parseQuery } from '@/src/modules/entries/schemas';
import { ok, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** §12.8 `GET /audit-logs`. Admin-only; the service refuses anyone else. */
export const GET = route(async (request) => {
  const actor = await requireCurrentUser(request);
  return ok(await listAuditLogs(actor, parseQuery(auditLogQuerySchema, request.url)));
});
