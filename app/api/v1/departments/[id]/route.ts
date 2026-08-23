import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { deleteDepartment, updateDepartment } from '@/src/modules/departments/admin-service';
import { updateDepartmentSchema } from '@/src/modules/departments/schemas';
import { ok, readJson, requireJsonContentType, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, context: Context) => {
  const actor = await requireCurrentUser(request);
  const { id } = await context.params;
  const body = await readJson(request, updateDepartmentSchema);
  return ok(await updateDepartment(actor, id, body));
});

export const DELETE = route(async (request: Request, context: Context) => {
  requireJsonContentType(request);
  const actor = await requireCurrentUser(request);
  const { id } = await context.params;
  await deleteDepartment(actor, id);
  return new NextResponse(null, { status: 204 });
});
