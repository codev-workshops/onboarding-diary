import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { updateUserSchema } from '@/src/modules/users/admin-schemas';
import { getUserForAdmin, updateUser } from '@/src/modules/users/admin-service';
import { getScopedUser } from '@/src/modules/users/service';
import { ok, readJson, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  const actor = await requireCurrentUser(request);
  const { id } = await context.params;

  if (actor.role !== 'ADMIN') return ok(await getScopedUser(actor, id));

  return ok(await getUserForAdmin(actor, id));
});

export const PATCH = route(async (request: Request, context: Context) => {
  const actor = await requireCurrentUser(request);
  const { id } = await context.params;
  const body = await readJson(request, updateUserSchema);
  return ok(await updateUser(actor, id, body));
});
