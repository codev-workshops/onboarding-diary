import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { changePasswordSchema } from '@/src/modules/users/self-schemas';
import { changeOwnPassword } from '@/src/modules/users/self-service';
import { noContent, readJson, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The one write a user with `must_change_password` is allowed to make, which is
 * why it opts out of the forced-change guard.
 */
export const POST = route(async (request) => {
  const actor = await requireCurrentUser(request, { allowPasswordChange: true });
  const body = await readJson(request, changePasswordSchema);
  await changeOwnPassword(actor, body);
  return noContent();
});
