import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { listDirectReports } from '@/src/modules/users/self-service';
import { ok, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: Context) => {
  const actor = await requireCurrentUser(request);
  const { id } = await context.params;
  return ok(await listDirectReports(actor, id));
});
