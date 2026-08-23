import type { FeedbackVisibility, UserRole } from '@prisma/client';

import {
  fieldNotPermitted,
  forbiddenField,
  insufficientRole,
  notFound,
  outOfScopeAt,
  sectionNotPermitted,
} from '@/src/modules/authz/errors';
import { isReadable, readableUserIds, type Actor, type ReadableUsers } from '@/src/modules/authz/scope';

export type EntryKind = 'TASK' | 'ISSUE' | 'FEEDBACK' | 'NOTE';

/** The authorization-relevant shape of an entry; the payload is irrelevant here. */
export type EntrySubject = {
  ownerId: string;
  visibility?: FeedbackVisibility;
};

/** The only fields a manager may write, and only on an in-scope recruit's issue. */
export const MANAGER_ISSUE_FIELDS = ['status', 'resolutionNotes'] as const;

/** Never settable through the self-service profile route, whatever the role. */
export const SELF_PROFILE_FORBIDDEN_FIELDS = ['role', 'managerId', 'isActive', 'email'] as const;

export function assertRole(actor: Actor, allowed: readonly UserRole[]): void {
  if (!allowed.includes(actor.role)) throw insufficientRole();
}

/**
 * Being in scope is not the same as being entitled. Notes are owner-private —
 * a manager is refused their own report's notes, and refused with a 404 so the
 * refusal cannot be used to detect that a note exists (AZ-M4). Feedback marked
 * ADMIN_ONLY behaves the same way for managers.
 */
export function isEntryVisible(
  actor: Actor,
  readable: ReadableUsers,
  kind: EntryKind,
  entry: EntrySubject
): boolean {
  if (entry.ownerId === actor.id) return true;
  if (actor.role === 'ADMIN') return true;
  if (!isReadable(readable, entry.ownerId)) return false;
  if (kind === 'NOTE') return false;
  if (kind === 'FEEDBACK' && entry.visibility === 'ADMIN_ONLY') return false;
  return true;
}

export async function assertEntryVisible(actor: Actor, kind: EntryKind, entry: EntrySubject): Promise<void> {
  const readable = await readableUserIds(actor);
  if (!isEntryVisible(actor, readable, kind, entry)) throw notFound();
}

/**
 * Entries are authored by their owner. Admins may write across users (audited
 * once M11 lands); managers may not, in scope or out of it (AZ-M10) — a manager
 * writing a recruit's diary would destroy the ownership guarantee that makes
 * the diary evidence of anything.
 */
export async function assertCanCreateEntry(actor: Actor, ownerId: string): Promise<void> {
  if (ownerId === actor.id || actor.role === 'ADMIN') return;
  throw insufficientRole();
}

/**
 * Field-level authorization for updates. The caller passes the field names its
 * schema actually parsed, and a rejection rejects the whole request: partially
 * applying a manager's issue patch would be worse than refusing it (AZ-M5).
 */
export async function assertCanUpdateEntry(
  actor: Actor,
  kind: EntryKind,
  entry: EntrySubject,
  fields: readonly string[]
): Promise<void> {
  await assertEntryVisible(actor, kind, entry);

  if (entry.ownerId === actor.id || actor.role === 'ADMIN') return;

  const permitted: readonly string[] =
    actor.role === 'MANAGER' && kind === 'ISSUE' ? MANAGER_ISSUE_FIELDS : [];
  const rejected = fields.filter((field) => !permitted.includes(field));
  if (rejected.length > 0) throw fieldNotPermitted(rejected);
}

/** Deleting someone else's entry is an owner-or-admin operation (A-13). */
export async function assertCanDeleteEntry(
  actor: Actor,
  kind: EntryKind,
  entry: EntrySubject
): Promise<void> {
  await assertEntryVisible(actor, kind, entry);
  if (entry.ownerId === actor.id || actor.role === 'ADMIN') return;
  throw insufficientRole();
}

/** AZ-R5: privilege fields are rejected outright, not silently dropped. */
export function assertSelfProfileFields(fields: readonly string[]): void {
  const rejected = fields.filter((field) =>
    (SELF_PROFILE_FORBIDDEN_FIELDS as readonly string[]).includes(field)
  );
  if (rejected.length > 0) throw forbiddenField(rejected);
}

export type ReportScopeType = 'SELF' | 'USER' | 'USERS' | 'DEPARTMENT' | 'ORG';
export type ReportSection = 'TASKS' | 'ISSUES' | 'FEEDBACK' | 'NOTES';

export type ReportRequest = {
  scopeType: ReportScopeType;
  userIds?: string[];
  sections: readonly ReportSection[];
};

/**
 * The users a report will cover. `ALL` is kept distinct from a list for the
 * same reason `ReadableUsers` does it, and — more importantly here — so that an
 * empty list means "nobody" rather than "everybody": a department with no
 * members must produce an empty report, not the organisation.
 */
export type ReportTargets = { kind: 'ALL' } | { kind: 'IDS'; ids: string[] };

const REPORT_SCOPES: Record<UserRole, readonly ReportScopeType[]> = {
  RECRUIT: ['SELF'],
  MANAGER: ['SELF', 'USER', 'USERS'],
  ADMIN: ['SELF', 'USER', 'USERS', 'DEPARTMENT', 'ORG'],
};

/**
 * Resolves a report to the exact set of users it will cover, or fails. There is
 * deliberately no middle ground: narrowing an out-of-scope request to the
 * readable subset would hand a manager a report that silently omits rows while
 * looking complete, which is worse than an error (AZ-M6, §17.3).
 */
export async function resolveReportTargets(actor: Actor, request: ReportRequest): Promise<ReportTargets> {
  if (!REPORT_SCOPES[actor.role].includes(request.scopeType)) throw insufficientRole();

  if (actor.role !== 'ADMIN' && request.sections.includes('NOTES') && request.scopeType !== 'SELF') {
    throw sectionNotPermitted('NOTES');
  }

  if (request.scopeType === 'SELF') return { kind: 'IDS', ids: [actor.id] };

  const readable = await readableUserIds(actor);

  if (request.scopeType === 'ORG') {
    if (readable.kind !== 'ALL') throw insufficientRole();
    return { kind: 'ALL' };
  }

  const requested = request.userIds ?? [];

  // A department is expanded to its members by the caller, which is an
  // admin-only directory read; the ids arrive here already enumerated so that
  // an empty department stays empty instead of falling through to "all".
  if (request.scopeType === 'DEPARTMENT') {
    if (readable.kind !== 'ALL') throw insufficientRole();
    return { kind: 'IDS', ids: requested };
  }

  if (requested.length === 0) {
    if (readable.kind === 'ALL') return { kind: 'ALL' };
    return { kind: 'IDS', ids: readable.ids.filter((id) => id !== actor.id) };
  }

  const offending = requested
    .map((id, index) => (isReadable(readable, id) ? null : index))
    .filter((index): index is number => index !== null);
  if (offending.length > 0) throw outOfScopeAt(offending);

  return { kind: 'IDS', ids: requested };
}
