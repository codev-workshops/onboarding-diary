import type { UserRole } from '@prisma/client';

import { outOfScope } from '@/src/modules/authz/errors';
import { prisma } from '@/src/shared/db/prisma';

/** Everything authorization needs to know about the caller. Nothing else. */
export type Actor = {
  id: string;
  role: UserRole;
};

/**
 * The result of `readable_user_ids(actor)`. `ALL` is kept distinct from a list
 * of every id so that an admin query stays a plain query rather than an
 * `IN (…10 000 ids…)` predicate.
 */
export type ReadableUsers = { kind: 'ALL' } | { kind: 'IDS'; ids: string[] };

/** A Prisma `where` fragment; every entry table has `owner_id`. */
export type OwnerFilter = { ownerId?: { in: string[] } };

/**
 * readable_user_ids(actor) :=
 *   ADMIN   -> all user ids
 *   MANAGER -> {actor.id} ∪ {u.id : u.manager_id = actor.id}
 *   RECRUIT -> {actor.id}
 *
 * Resolved from `users.manager_id` on every call and never cached: an admin
 * reassigning a recruit must take effect on the manager's very next request
 * (AZ-M8). Scope is deliberately one level deep — a manager's manager sees
 * neither the sub-tree nor its entries.
 *
 * Deactivated reports stay in scope: their entries are historical record, and
 * dropping them would silently shrink a manager's reports the moment someone
 * leaves.
 */
export async function readableUserIds(actor: Actor): Promise<ReadableUsers> {
  if (actor.role === 'ADMIN') return { kind: 'ALL' };
  if (actor.role === 'RECRUIT') return { kind: 'IDS', ids: [actor.id] };

  const reports = await prisma.user.findMany({
    where: { managerId: actor.id },
    select: { id: true },
  });

  return { kind: 'IDS', ids: [actor.id, ...reports.map((report) => report.id)] };
}

export function isReadable(readable: ReadableUsers, userId: string): boolean {
  return readable.kind === 'ALL' || readable.ids.includes(userId);
}

/** Turns the predicate into SQL. The only way scope reaches the database. */
export function ownerFilter(readable: ReadableUsers): OwnerFilter {
  return readable.kind === 'ALL' ? {} : { ownerId: { in: readable.ids } };
}

/**
 * Narrows a list query to one explicitly requested owner, having first checked
 * that the caller may see them. A client-supplied `owner_id` is an assertion
 * about scope, so it is validated here rather than being passed to the
 * repository where it could only ever widen the result set (API8).
 */
export async function resolveOwnerFilter(actor: Actor, requestedOwnerId?: string): Promise<OwnerFilter> {
  const readable = await readableUserIds(actor);
  if (!requestedOwnerId) return ownerFilter(readable);

  if (!isReadable(readable, requestedOwnerId)) throw outOfScope();
  return { ownerId: { in: [requestedOwnerId] } };
}

/** For write paths, which name an owner rather than filtering by one. */
export async function assertOwnerInScope(actor: Actor, ownerId: string): Promise<void> {
  const readable = await readableUserIds(actor);
  if (!isReadable(readable, ownerId)) throw outOfScope();
}
