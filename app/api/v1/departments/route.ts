import { listActiveDepartments } from '@/src/modules/departments/service';
import { ok, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public by design (C9): the signup form needs the department list before a
 * session exists, and department names are not sensitive.
 */
export const GET = route(async () => {
  return ok(await listActiveDepartments());
});
