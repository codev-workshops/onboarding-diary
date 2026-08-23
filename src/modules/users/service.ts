import { assertRole } from '@/src/modules/authz/policy';
import { notFound, outOfScopeAt } from '@/src/modules/authz/errors';
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

/**
 * The subjects of a report, in the order they will be listed. Ids the caller
 * may not read fail the whole call by position (never by identity), which is
 * the same rule `resolveReportTargets` applies — restated here because this is
 * a directory read and must not become a way to confirm that a user exists.
 */
export async function listUsersByIds(actor: Actor, ids: readonly string[]): Promise<UserSummary[]> {
  if (ids.length === 0) return [];

  const readable = await readableUserIds(actor);
  const offending = ids
    .map((id, index) => (isReadable(readable, id) ? null : index))
    .filter((index): index is number => index !== null);
  if (offending.length > 0) throw outOfScopeAt(offending);

  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
    orderBy: [{ fullName: 'asc' }],
    select: userSummarySelect,
  });

  return users.map(toUserSummary);
}

/** Members of one department, for an admin's department-wide report. */
export async function listDepartmentUserIds(actor: Actor, departmentId: string): Promise<string[]> {
  assertRole(actor, ['ADMIN']);

  const users = await prisma.user.findMany({
    where: { departmentId },
    orderBy: [{ fullName: 'asc' }],
    select: { id: true },
  });

  return users.map((user) => user.id);
}

export async function getVisibleUser(actor: Actor, userId: string): Promise<UserSummary> {
  assertRole(actor, ['MANAGER', 'ADMIN']);

  const readable = await readableUserIds(actor);
  if (!isReadable(readable, userId)) throw notFound();

  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSummarySelect });
  if (!user) throw notFound();

  return toUserSummary(user);
}
