import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { resetUserPassword } from '@/src/modules/users/admin-service';
import { ok, requireJsonContentType, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: Context) => {
  requireJsonContentType(request);
  const actor = await requireCurrentUser(request);
  const { id } = await context.params;
  return ok(await resetUserPassword(actor, id));
});
