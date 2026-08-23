import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { setUserActive } from '@/src/modules/users/admin-service';
import { ok, requireJsonContentType, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/**
 * Reads no body, so it has to ask for the content type itself — that check is
 * what stands in for a CSRF token (S4).
 */
export const POST = route(async (request: Request, context: Context) => {
  requireJsonContentType(request);
  const actor = await requireCurrentUser(request);
  const { id } = await context.params;
  return ok(await setUserActive(actor, id, true));
});
