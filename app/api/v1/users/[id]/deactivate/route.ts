import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { deactivateUserSchema } from '@/src/modules/users/admin-schemas';
import { setUserActive } from '@/src/modules/users/admin-service';
import { ok, readJson, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: Context) => {
  const actor = await requireCurrentUser(request);
  const { id } = await context.params;
  const body = await readJson(request, deactivateUserSchema);
  return ok(await setUserActive(actor, id, false, body.reason));
});
