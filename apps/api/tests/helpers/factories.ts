import type { FeedbackType, Role } from '@onboarding-diary/shared';

import { hashPassword } from '../../src/lib/password.js';
import type { User } from '../../src/generated/prisma/client.js';
import { getTestDb } from './database.js';

export const TEST_PASSWORD = 'integration-test-pw-1';

let sequence = 0;

function nextEmail(prefix: string): string {
  sequence += 1;
  return `${prefix}.${sequence}@example.com`;
}

export function calendarDate(daysAgo = 0): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

export async function createUser(
  overrides: Partial<
    Pick<User, 'email' | 'fullName' | 'role' | 'managerId' | 'isActive' | 'department'>
  > & {
    password?: string;
  } = {},
): Promise<User> {
  const { password = TEST_PASSWORD, ...rest } = overrides;
  const role: Role = rest.role ?? 'RECRUIT';
  return getTestDb().user.create({
    data: {
      email: rest.email ?? nextEmail(role.toLowerCase()),
      fullName: rest.fullName ?? 'Test Person',
      passwordHash: await hashPassword(password),
      role,
      department: rest.department ?? null,
      managerId: rest.managerId ?? null,
      isActive: rest.isActive ?? true,
    },
  });
}

export async function createTask(
  ownerId: string,
  overrides: { title?: string; daysAgo?: number } = {},
): Promise<{ id: string }> {
  return getTestDb().taskEntry.create({
    data: {
      ownerId,
      entryDate: calendarDate(overrides.daysAgo ?? 0),
      title: overrides.title ?? 'Complete VPN setup',
    },
    select: { id: true },
  });
}

export async function createIssue(
  ownerId: string,
  overrides: { title?: string; daysAgo?: number } = {},
): Promise<{ id: string }> {
  return getTestDb().issueEntry.create({
    data: {
      ownerId,
      entryDate: calendarDate(overrides.daysAgo ?? 0),
      title: overrides.title ?? 'VPN token expired',
    },
    select: { id: true },
  });
}

export async function createFeedback(
  ownerId: string,
  overrides: { subject?: string; type?: FeedbackType; daysAgo?: number } = {},
): Promise<{ id: string }> {
  return getTestDb().feedbackNote.create({
    data: {
      ownerId,
      entryDate: calendarDate(overrides.daysAgo ?? 0),
      subject: overrides.subject ?? 'Buddy system works well',
      type: overrides.type ?? 'POSITIVE',
    },
    select: { id: true },
  });
}

export async function createNote(
  ownerId: string,
  overrides: { title?: string; daysAgo?: number; tags?: readonly string[] } = {},
): Promise<{ id: string }> {
  return getTestDb().note.create({
    data: {
      ownerId,
      entryDate: calendarDate(overrides.daysAgo ?? 0),
      title: overrides.title ?? 'Day one notes',
      tags: {
        create: (overrides.tags ?? []).map((name) => ({
          tag: { connectOrCreate: { where: { name }, create: { name } } },
        })),
      },
    },
    select: { id: true },
  });
}
