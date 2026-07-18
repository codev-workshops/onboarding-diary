import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import type { JwtPayload } from '../../auth/jwt.js';
import { accessibleOwnerIds, assertCanAccessOwner, ownerFilter } from '../../access/scope.js';
import { ApiError } from '../../http/errors.js';
import { FEEDBACK_TYPES } from '../../domain/enums.js';

const isoDate = z.coerce.date();

export const feedbackCreateSchema = z.object({
  date: isoDate,
  subject: z.string().min(1).max(200),
  type: z.enum(FEEDBACK_TYPES),
  details: z.string().max(5000).default(''),
});

export const feedbackUpdateSchema = feedbackCreateSchema.partial();

export const feedbackFilterSchema = z.object({
  type: z.enum(FEEDBACK_TYPES).optional(),
});

export type FeedbackCreateInput = z.infer<typeof feedbackCreateSchema>;
export type FeedbackUpdateInput = z.infer<typeof feedbackUpdateSchema>;
export type FeedbackFilter = z.infer<typeof feedbackFilterSchema>;

export async function listFeedback(db: Db, actor: JwtPayload, filter: FeedbackFilter) {
  const ids = await accessibleOwnerIds(db, actor);
  return db.feedback.findMany({
    where: {
      ...ownerFilter(ids),
      ...(filter.type ? { type: filter.type } : {}),
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getFeedback(db: Db, actor: JwtPayload, id: string) {
  const item = await db.feedback.findUnique({ where: { id } });
  if (!item) throw ApiError.notFound('Feedback not found');
  const ids = await accessibleOwnerIds(db, actor);
  assertCanAccessOwner(ids, item.ownerId);
  return item;
}

export async function createFeedback(db: Db, actor: JwtPayload, input: FeedbackCreateInput) {
  return db.feedback.create({ data: { ...input, ownerId: actor.sub } });
}

export async function updateFeedback(
  db: Db,
  actor: JwtPayload,
  id: string,
  input: FeedbackUpdateInput,
) {
  await getFeedback(db, actor, id);
  return db.feedback.update({ where: { id }, data: input });
}

export async function deleteFeedback(db: Db, actor: JwtPayload, id: string): Promise<void> {
  await getFeedback(db, actor, id);
  await db.feedback.delete({ where: { id } });
}
