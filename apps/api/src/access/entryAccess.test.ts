import { describe, expect, it } from 'vitest';

import { resolveEntryAccess, type Caller, type TargetOwner } from './entryAccess.js';

const CALLER_ID = 'caller-1';
const OTHER_ID = 'other-1';

const self: TargetOwner = { id: CALLER_ID, managerId: null };
const directReport: TargetOwner = { id: OTHER_ID, managerId: CALLER_ID };
const stranger: TargetOwner = { id: OTHER_ID, managerId: 'someone-else' };

const caller = (role: Caller['role']): Caller => ({ id: CALLER_ID, role });

describe('resolveEntryAccess', () => {
  it.each([
    ['RECRUIT', 'self', caller('RECRUIT'), self, true, true],
    ['RECRUIT', 'another user', caller('RECRUIT'), stranger, false, false],
    ['RECRUIT', 'their own manager-linked peer', caller('RECRUIT'), directReport, false, false],
    ['MANAGER', 'self', caller('MANAGER'), self, true, true],
    ['MANAGER', 'a direct report', caller('MANAGER'), directReport, true, false],
    ['MANAGER', 'any other user', caller('MANAGER'), stranger, false, false],
    ['ADMIN', 'self', caller('ADMIN'), self, true, true],
    ['ADMIN', 'anyone', caller('ADMIN'), stranger, true, true],
  ] as const)('%s → %s', (_role, _target, actor, target, canRead, canWrite) => {
    expect(resolveEntryAccess(actor, target)).toEqual({ canRead, canWrite });
  });
});
