import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { notFound } from '@/src/modules/authz/errors';
import { updateTaskSchema } from '@/src/modules/tasks/schemas';
import { deleteTask, getTask, updateTask } from '@/src/modules/tasks/service';
import { ok, readJson, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/**
 * A malformed id is a 404 rather than a 422: the two must be indistinguishable,
 * or the shape of an id becomes an oracle for which ids exist.
 */
const idSchema = z.string().uuid();

async function taskId(context: Context): Promise<string> {
  const { id } = await context.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw notFound();
  return parsed.data;
}

export const GET = route(async (request: Request, context: Context) => {
  const actor = await requireCurrentUser(request);
  return ok(await getTask(actor, await taskId(context)));
});

export const PATCH = route(async (request: Request, context: Context) => {
  const actor = await requireCurrentUser(request);
  const id = await taskId(context);
  const body = await readJson(request, updateTaskSchema);
  return ok(await updateTask(actor, id, body));
});

/**
 * No JSON content-type guard here: an HTML form cannot issue a DELETE at all,
 * so `SameSite=Lax` already covers it and demanding a content type on a bodiless
 * request would only break well-behaved clients.
 */
export const DELETE = route(async (request: Request, context: Context) => {
  const actor = await requireCurrentUser(request);
  await deleteTask(actor, await taskId(context));
  return new NextResponse(null, { status: 204 });
});
