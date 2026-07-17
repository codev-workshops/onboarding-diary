import type { Db } from '../db/prisma.js';
import type { JwtPayload } from '../auth/jwt.js';
import { ApiError } from '../http/errors.js';

/**
 * Resolves the set of user IDs whose entries the given user may access
 * (docs/ASSUMPTIONS.md §7):
 * - Recruit: only their own.
 * - Manager: the recruits they oversee (plus themselves).
 * - Admin: unrestricted (returns `null`, meaning "no owner filter").
 */
export async function accessibleOwnerIds(
  db: Db,
  user: Pick<JwtPayload, 'sub' | 'role'>,
): Promise<string[] | null> {
  if (user.role === 'Admin') return null;
  if (user.role === 'Recruit') return [user.sub];

  const recruits = await db.user.findMany({
    where: { managerId: user.sub },
    select: { id: true },
  });
  return [user.sub, ...recruits.map((r) => r.id)];
}

/** Builds a Prisma `ownerId` filter fragment from an accessible-ids list. */
export function ownerFilter(ownerIds: string[] | null): { ownerId?: { in: string[] } } {
  return ownerIds === null ? {} : { ownerId: { in: ownerIds } };
}

/**
 * Asserts the user may access a specific owner's data, throwing 403 otherwise.
 * Used when reading/mutating an entry owned by `ownerId`.
 */
export function assertCanAccessOwner(ownerIds: string[] | null, ownerId: string): void {
  if (ownerIds === null) return;
  if (!ownerIds.includes(ownerId)) {
    throw ApiError.forbidden('You do not have access to this resource');
  }
}
