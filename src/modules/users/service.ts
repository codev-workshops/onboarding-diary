import { assertRole } from '@/src/modules/authz/policy';
import { notFound } from '@/src/modules/authz/errors';
import { isReadable, readableUserIds, type Actor } from '@/src/modules/authz/scope';
import { toUserSummary, userSummarySelect, type UserSummary } from '@/src/modules/users/dto';
import { prisma } from '@/src/shared/db/prisma';

/**
 * Directory reads. Recruits have no directory at all (AZ-R4) — they see
 * themselves through `/auth/me` — so the role check is the first thing here,
 * not a route-level concern.
 */
export async function listVisibleUsers(actor: Actor): Promise<UserSummary[]> {
  assertRole(actor, ['MANAGER', 'ADMIN']);

  const readable = await readableUserIds(actor);
  const users = await prisma.user.findMany({
    where: readable.kind === 'ALL' ? {} : { id: { in: readable.ids } },
    orderBy: [{ fullName: 'asc' }],
    select: userSummarySelect,
  });

  return users.map(toUserSummary);
}

/**
 * Identity for a dashboard subject. Reading one's own summary needs no
 * directory privilege — a recruit has no directory at all — so self is served
 * directly and anybody else goes through the scoped read below.
 */
export async function getScopedUser(actor: Actor, userId: string): Promise<UserSummary> {
  if (userId !== actor.id) return getVisibleUser(actor, userId);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSummarySelect });
  if (!user) throw notFound();

  return toUserSummary(user);
}

export async function getVisibleUser(actor: Actor, userId: string): Promise<UserSummary> {
  assertRole(actor, ['MANAGER', 'ADMIN']);

  const readable = await readableUserIds(actor);
  if (!isReadable(readable, userId)) throw notFound();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSummarySelect });
  if (!user) throw notFound();

  return toUserSummary(user);
}
