import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import type { JwtPayload } from '../../auth/jwt.js';
import { accessibleOwnerIds, assertCanAccessOwner } from '../../access/scope.js';
import { ApiError } from '../../http/errors.js';
import { handleForEmail, parseMentionHandles } from '../../domain/mentions.js';

export const commentCreateSchema = z.object({
  body: z.string().min(1).max(5000),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

const commentInclude = {
  author: { select: { id: true, name: true, email: true, isActive: true } },
  mentions: {
    include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
  },
} as const;

/** Asserts the actor may access the task (and returns it), per §7 scope. */
async function assertTaskAccessible(db: Db, actor: JwtPayload, taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw ApiError.notFound('Task not found');
  const ids = await accessibleOwnerIds(db, actor);
  assertCanAccessOwner(ids, task.ownerId);
  return task;
}

export async function listComments(db: Db, actor: JwtPayload, taskId: string) {
  await assertTaskAccessible(db, actor, taskId);
  return db.comment.findMany({
    where: { taskId },
    include: commentInclude,
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Creates a comment on a task and records a mention (notification) for every
 * resolvable @handle in the body, excluding the author (docs/ASSUMPTIONS.md §19).
 */
export async function createComment(
  db: Db,
  actor: JwtPayload,
  taskId: string,
  input: CommentCreateInput,
) {
  await assertTaskAccessible(db, actor, taskId);

  const handles = parseMentionHandles(input.body);
  const mentionUserIds: string[] = [];
  if (handles.length > 0) {
    const users = await db.user.findMany({ select: { id: true, email: true } });
    for (const user of users) {
      if (handles.includes(handleForEmail(user.email)) && user.id !== actor.sub) {
        mentionUserIds.push(user.id);
      }
    }
  }

  return db.comment.create({
    data: {
      taskId,
      authorId: actor.sub,
      body: input.body,
      mentions: { create: mentionUserIds.map((userId) => ({ userId })) },
    },
    include: commentInclude,
  });
}
