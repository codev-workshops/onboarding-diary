import { describe, expect, it } from 'vitest';

import { PASSWORD_MIN_LENGTH, TITLE_MAX_LENGTH } from '../constants.js';
import { todayUtc } from '../primitives.js';
import { loginBody, signupBody } from './auth.js';
import { createFeedbackBody } from './feedback.js';
import { createIssueBody, listIssuesQuery } from './issue.js';
import { createNoteBody, normaliseTags } from './note.js';
import { createTaskBody, updateTaskBody } from './task.js';
import { updateOwnProfileBody, updateUserBody } from './user.js';

const today = todayUtc();

describe('signupBody', () => {
  it('normalises the email and trims the name', () => {
    expect(
      signupBody.parse({
        fullName: '  Nadia Khan ',
        email: ' Nadia.Khan@Example.COM ',
        password: 'correct horse battery',
      }),
    ).toEqual({
      fullName: 'Nadia Khan',
      email: 'nadia.khan@example.com',
      password: 'correct horse battery',
    });
  });

  it('rejects a short password', () => {
    const result = signupBody.safeParse({
      fullName: 'Nadia',
      email: 'nadia@example.com',
      password: 'a'.repeat(PASSWORD_MIN_LENGTH - 1),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['password']);
  });

  it('rejects a malformed email', () => {
    expect(
      signupBody.safeParse({ fullName: 'Nadia', email: 'nope', password: 'longenoughpw' }).success,
    ).toBe(false);
  });

  it('rejects a blank name', () => {
    expect(
      signupBody.safeParse({ fullName: '   ', email: 'a@b.com', password: 'longenoughpw' }).success,
    ).toBe(false);
  });
});

describe('loginBody', () => {
  it('requires a password but does not apply the strength rule', () => {
    expect(loginBody.parse({ email: 'a@b.com', password: 'x' }).password).toBe('x');
    expect(loginBody.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('createTaskBody', () => {
  it('applies the documented defaults', () => {
    expect(createTaskBody.parse({ entryDate: today, title: 'Set up VPN' })).toEqual({
      entryDate: today,
      title: 'Set up VPN',
      category: 'OTHER',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
    });
  });

  it('rejects a missing title', () => {
    expect(createTaskBody.safeParse({ entryDate: today }).success).toBe(false);
  });

  it('rejects an over-long title', () => {
    expect(
      createTaskBody.safeParse({ entryDate: today, title: 'x'.repeat(TITLE_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
  });

  it('rejects a future entry date', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(createTaskBody.safeParse({ entryDate: tomorrow, title: 'Later' }).success).toBe(false);
  });

  it('normalises an empty description to null', () => {
    expect(
      createTaskBody.parse({ entryDate: today, title: 'T', description: '  ' }).description,
    ).toBeNull();
  });

  it('rejects an unknown status', () => {
    expect(
      createTaskBody.safeParse({ entryDate: today, title: 'T', status: 'ALMOST' }).success,
    ).toBe(false);
  });
});

describe('updateTaskBody', () => {
  it('accepts a partial payload', () => {
    expect(updateTaskBody.parse({ status: 'DONE' })).toEqual({ status: 'DONE' });
  });

  it('accepts an empty payload', () => {
    expect(updateTaskBody.parse({})).toEqual({});
  });
});

describe('createIssueBody', () => {
  it('applies the documented defaults', () => {
    expect(createIssueBody.parse({ entryDate: today, title: 'VPN token expired' })).toMatchObject({
      severity: 'MEDIUM',
      status: 'OPEN',
    });
  });
});

describe('listIssuesQuery', () => {
  it('parses multi-value status filters', () => {
    expect(listIssuesQuery.parse({ status: 'OPEN,IN_PROGRESS' }).status).toEqual([
      'OPEN',
      'IN_PROGRESS',
    ]);
  });
});

describe('createFeedbackBody', () => {
  it('requires a type', () => {
    expect(
      createFeedbackBody.safeParse({ entryDate: today, subject: 'Buddy system' }).success,
    ).toBe(false);
  });

  it('accepts a valid note', () => {
    expect(
      createFeedbackBody.parse({
        entryDate: today,
        subject: 'Buddy system',
        type: 'SUGGESTION',
      }).type,
    ).toBe('SUGGESTION');
  });
});

describe('normaliseTags', () => {
  it('lowercases, trims, de-duplicates, and drops blanks', () => {
    expect(normaliseTags(['Setup', 'setup ', ' VPN', '', '  '])).toEqual(['setup', 'vpn']);
  });
});

describe('createNoteBody', () => {
  it('defaults tags to an empty array and normalises supplied tags', () => {
    expect(createNoteBody.parse({ entryDate: today, title: 'Day 1' }).tags).toEqual([]);
    expect(
      createNoteBody.parse({ entryDate: today, title: 'Day 1', tags: ['Setup', 'setup', 'VPN'] })
        .tags,
    ).toEqual(['setup', 'vpn']);
  });
});

describe('user schemas', () => {
  it('lets a profile update clear the department', () => {
    expect(updateOwnProfileBody.parse({ department: '' }).department).toBeNull();
  });

  it('accepts a role change and a cleared manager', () => {
    expect(updateUserBody.parse({ role: 'MANAGER', managerId: null })).toEqual({
      role: 'MANAGER',
      managerId: null,
    });
  });

  it('rejects an unknown role', () => {
    expect(updateUserBody.safeParse({ role: 'SUPERUSER' }).success).toBe(false);
  });
});
