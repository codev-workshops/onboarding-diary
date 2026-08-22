import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { updateFeedbackSchema } from '@/src/modules/feedback/schemas';
import { deleteFeedback, getFeedback, updateFeedback } from '@/src/modules/feedback/service';
import { ok, readJson, route } from '@/src/shared/http/envelope';
import { resourceId, type IdContext } from '@/src/shared/http/resource-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request: Request, context: IdContext) => {
  const actor = await requireCurrentUser(request);
  return ok(await getFeedback(actor, await resourceId(context)));
});

export const PATCH = route(async (request: Request, context: IdContext) => {
  const actor = await requireCurrentUser(request);
  const id = await resourceId(context);
  const body = await readJson(request, updateFeedbackSchema);
  return ok(await updateFeedback(actor, id, body));
});

export const DELETE = route(async (request: Request, context: IdContext) => {
  const actor = await requireCurrentUser(request);
  await deleteFeedback(actor, await resourceId(context));
  return new NextResponse(null, { status: 204 });
});
