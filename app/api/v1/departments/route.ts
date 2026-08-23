import { getCurrentUser, requireCurrentUser } from '@/src/modules/auth/current-user';
import { createDepartment, listDepartmentsForAdmin } from '@/src/modules/departments/admin-service';
import { listActiveDepartments } from '@/src/modules/departments/service';
import { createDepartmentSchema, departmentQuerySchema } from '@/src/modules/departments/schemas';
import { parseQuery } from '@/src/modules/entries/schemas';
import { ok, readJson, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public by design (C9): the signup form needs the department list before a
 * session exists, and department names are not sensitive. An admin gets the
 * management view instead — member counts and, on request, the deactivated
 * ones — because only an admin may act on either.
 */
export const GET = route(async (request) => {
  const actor = await getCurrentUser(request);
  const query = parseQuery(departmentQuerySchema, request.url);

  if (actor?.role !== 'ADMIN') return ok(await listActiveDepartments());

  return ok(await listDepartmentsForAdmin(actor, query.include_inactive));
});

export const POST = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const body = await readJson(request, createDepartmentSchema);
  return ok(await createDepartment(actor, body), { status: 201 });
});
