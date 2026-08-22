import { z } from 'zod';

import { notFound } from '@/src/modules/authz/errors';

/**
 * A malformed id is a 404 rather than a 422: the two must be indistinguishable,
 * or the shape of an id becomes an oracle for which ids exist.
 */
const idSchema = z.string().uuid();

export async function resourceId(context: { params: Promise<{ id: string }> }): Promise<string> {
  const { id } = await context.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw notFound();
  return parsed.data;
}

export type IdContext = { params: Promise<{ id: string }> };
