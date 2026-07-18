import type { Db } from '../../db/prisma.js';
import type { JwtPayload } from '../../auth/jwt.js';
import { ApiError } from '../../http/errors.js';

const mentionInclude = {
  comment: {
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true, isActive: true } },
      task: { select: { id: true, title: true } },
    },
  },
} as const;

/** Lists the actor's own mentions, newest first (docs/ASSUMPTIONS.md §19). */
export function listMentions(db: Db, actor: JwtPayload) {
  return db.mention.findMany({
    where: { userId: actor.sub },
    include: mentionInclude,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/** Count of the actor's unread mentions (drives the header activity badge). */
export function unreadMentionCount(db: Db, actor: JwtPayload): Promise<number> {
  return db.mention.count({ where: { userId: actor.sub, readAt: null } });
}

/** Marks all of the actor's mentions as read. */
export async function markAllMentionsRead(db: Db, actor: JwtPayload): Promise<void> {
  await db.mention.updateMany({
    where: { userId: actor.sub, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Marks a single mention as read; only the owner may do so. */
export async function markMentionRead(db: Db, actor: JwtPayload, id: string): Promise<void> {
  const mention = await db.mention.findUnique({ where: { id } });
  if (!mention || mention.userId !== actor.sub) throw ApiError.notFound('Mention not found');
  await db.mention.update({ where: { id }, data: { readAt: new Date() } });
}
