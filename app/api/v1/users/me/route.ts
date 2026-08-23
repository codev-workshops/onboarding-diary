import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { FORBIDDEN_SELF_FIELDS, updateSelfSchema } from '@/src/modules/users/self-schemas';
import { updateOwnProfile } from '@/src/modules/users/self-service';
import { ok, readJson, route } from '@/src/shared/http/envelope';
import { AppError } from '@/src/shared/http/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Everyone has a `/users/me`, including recruits, who have no directory at all
 * (AZ-R4). Naming a privileged field here fails the whole request with 403
 * rather than being ignored (AZ-R5): a request that asked to become an admin
 * and got a 200 back would be indistinguishable from one that succeeded.
 */
export const GET = route(async (request) =>
  ok(await requireCurrentUser(request, { allowPasswordChange: true }))
);

export const PATCH = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const body = await readJson(request, updateSelfSchema, (raw) => {
    const named = FORBIDDEN_SELF_FIELDS.filter((field) => field in raw);
    if (named.length > 0) {
      throw new AppError(
        'FORBIDDEN_FIELD',
        'These fields can only be changed by an administrator.',
        named.map((field) => ({ field, code: 'FORBIDDEN_FIELD' }))
      );
    }
  });

  return ok(await updateOwnProfile(actor, body));
});
