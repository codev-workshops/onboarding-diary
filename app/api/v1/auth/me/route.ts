import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { permissionsFor } from '@/src/modules/auth/permissions';
import { ok, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request) => {
  // Readable while a temporary password is outstanding: the change-password
  // screen needs to know who is signed in.
  const user = await requireCurrentUser(request, { allowPasswordChange: true });
  return ok({ user, permissions: permissionsFor(user.role) });
});
