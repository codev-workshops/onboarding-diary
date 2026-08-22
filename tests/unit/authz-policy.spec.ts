import { describe, expect, it } from 'vitest';

import {
  MANAGER_ISSUE_FIELDS,
  SELF_PROFILE_FORBIDDEN_FIELDS,
  assertRole,
  assertSelfProfileFields,
  isEntryVisible,
  type EntryKind,
} from '@/src/modules/authz/policy';
import { isReadable, ownerFilter, type Actor, type ReadableUsers } from '@/src/modules/authz/scope';
import { AppError } from '@/src/shared/http/errors';

const admin: Actor = { id: 'admin-id', role: 'ADMIN' };
const manager: Actor = { id: 'manager-id', role: 'MANAGER' };
const recruit: Actor = { id: 'recruit-id', role: 'RECRUIT' };

const managerScope: ReadableUsers = { kind: 'IDS', ids: ['manager-id', 'recruit-id'] };
const adminScope: ReadableUsers = { kind: 'ALL' };

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof AppError) return error.code;
    throw error;
  }
  return 'NO_ERROR';
}

describe('scope predicate helpers', () => {
  it('treats ALL as unconstrained and emits no owner clause', () => {
    expect(isReadable(adminScope, 'anyone')).toBe(true);
    expect(ownerFilter(adminScope)).toEqual({});
  });

  it('turns an id set into an owner_id IN (…) clause', () => {
    expect(ownerFilter(managerScope)).toEqual({ ownerId: { in: ['manager-id', 'recruit-id'] } });
    expect(isReadable(managerScope, 'stranger-id')).toBe(false);
  });
});

describe('entry visibility', () => {
  const cases: { kind: EntryKind; actor: Actor; ownerId: string; expected: boolean; why: string }[] = [
    { kind: 'TASK', actor: manager, ownerId: 'recruit-id', expected: true, why: 'in-scope task' },
    { kind: 'TASK', actor: manager, ownerId: 'stranger-id', expected: false, why: 'out-of-scope task' },
    { kind: 'NOTE', actor: manager, ownerId: 'recruit-id', expected: false, why: 'in-scope note' },
    { kind: 'NOTE', actor: manager, ownerId: 'manager-id', expected: true, why: 'own note' },
    { kind: 'NOTE', actor: admin, ownerId: 'recruit-id', expected: true, why: 'admin privileged read' },
    { kind: 'FEEDBACK', actor: manager, ownerId: 'recruit-id', expected: true, why: 'manager-visible' },
  ];

  it.each(cases)('$why -> $expected', ({ kind, actor, ownerId, expected }) => {
    const scope = actor.role === 'ADMIN' ? adminScope : managerScope;
    expect(isEntryVisible(actor, scope, kind, { ownerId })).toBe(expected);
  });

  it('hides ADMIN_ONLY feedback from the owner’s manager but not from its owner', () => {
    const entry = { ownerId: 'recruit-id', visibility: 'ADMIN_ONLY' as const };
    expect(isEntryVisible(manager, managerScope, 'FEEDBACK', entry)).toBe(false);
    expect(isEntryVisible(recruit, { kind: 'IDS', ids: ['recruit-id'] }, 'FEEDBACK', entry)).toBe(true);
    expect(isEntryVisible(admin, adminScope, 'FEEDBACK', entry)).toBe(true);
  });
});

describe('role gate', () => {
  it('rejects a role that lacks the capability with INSUFFICIENT_ROLE', () => {
    expect(codeOf(() => assertRole(recruit, ['ADMIN']))).toBe('INSUFFICIENT_ROLE');
    expect(codeOf(() => assertRole(manager, ['MANAGER', 'ADMIN']))).toBe('NO_ERROR');
  });
});

describe('self-profile field gate (AZ-R5)', () => {
  it.each(SELF_PROFILE_FORBIDDEN_FIELDS)('rejects %s with FORBIDDEN_FIELD', (field) => {
    expect(codeOf(() => assertSelfProfileFields(['fullName', field]))).toBe('FORBIDDEN_FIELD');
  });

  it('names every offending field so the client can fix the request in one go', () => {
    try {
      assertSelfProfileFields(['role', 'email', 'fullName']);
      expect.unreachable('expected FORBIDDEN_FIELD');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).details.map((detail) => detail.field)).toEqual(['role', 'email']);
    }
  });

  it('allows ordinary profile fields', () => {
    expect(codeOf(() => assertSelfProfileFields(['fullName', 'departmentId']))).toBe('NO_ERROR');
  });
});

describe('manager issue field allow-list', () => {
  it('is exactly status and resolution notes', () => {
    expect([...MANAGER_ISSUE_FIELDS]).toEqual(['status', 'resolutionNotes']);
  });
});
