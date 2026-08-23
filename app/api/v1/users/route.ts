import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { parseQuery } from '@/src/modules/entries/schemas';
import { adminUserListQuerySchema, createUserSchema } from '@/src/modules/users/admin-schemas';
import { createUser, listUsersForAdmin } from '@/src/modules/users/admin-service';
import { listVisibleUsers } from '@/src/modules/users/service';
import { ok, readJson, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One path, two DTOs: an admin gets `AdminUserView` (with emails and filters), a
 * manager gets the scoped `UserSummary` that has nowhere to put an email. The
 * branch is on the actor's role read from the database, never on a parameter.
 */
export const GET = route(async (request) => {
  const actor = await requireCurrentUser(request);

  if (actor.role !== 'ADMIN') return ok(await listVisibleUsers(actor));

  return ok(await listUsersForAdmin(actor, parseQuery(adminUserListQuerySchema, request.url)));
});

export const POST = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const body = await readJson(request, createUserSchema);
  return ok(await createUser(actor, body), { status: 201 });
});
