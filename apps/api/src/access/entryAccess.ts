/**
 * The single authorisation decision used by every entry, dashboard, and report handler
 * (TRD 5.3). Kept pure so the whole matrix can be table-tested.
 */

import type { Role } from '@onboarding-diary/shared';

import { ForbiddenError } from '../lib/errors.js';
import type { Db } from '../lib/prisma.js';

export type Caller = { id: string; role: Role };
export type TargetOwner = { id: string; managerId: string | null };
export type EntryAccess = { canRead: boolean; canWrite: boolean };
export type AccessMode = 'read' | 'write';

export function resolveEntryAccess(caller: Caller, target: TargetOwner): EntryAccess {
  if (caller.role === 'ADMIN') return { canRead: true, canWrite: true };
  if (caller.id === target.id) return { canRead: true, canWrite: true };
  if (caller.role === 'MANAGER' && target.managerId === caller.id) {
    // Managers observe their direct reports but never write for them (FR-X2).
    return { canRead: true, canWrite: false };
  }
  return { canRead: false, canWrite: false };
}

/**
 * Resolve the owner an entry request targets and assert the caller may act on it.
 * Unknown owners are reported as 403 so identifiers are not enumerable (TRD 5.3).
 */
export async function assertEntryAccess(
  db: Db,
  caller: Caller,
  ownerId: string | undefined,
  mode: AccessMode,
): Promise<string> {
  const targetId = ownerId ?? caller.id;

  if (targetId === caller.id) {
    const access = resolveEntryAccess(caller, { id: caller.id, managerId: null });
    if (mode === 'read' ? access.canRead : access.canWrite) return targetId;
    throw new ForbiddenError();
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, managerId: true },
  });
  if (target === null) throw new ForbiddenError();

  const access = resolveEntryAccess(caller, target);
  if (mode === 'read' ? access.canRead : access.canWrite) return targetId;
  throw new ForbiddenError();
}
