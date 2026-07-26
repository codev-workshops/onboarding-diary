/**
 * Development seed: one admin, two managers, and six recruits with sample entries across
 * every category and a spread of dates (T-027). Re-running it converges on the same rows.
 */

import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';

import {
  FEEDBACK_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@onboarding-diary/shared';

import { hashPassword } from '../src/lib/password.js';
import { createPrismaClient, type Db } from '../src/lib/prisma.js';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

export const SEED_PASSWORD = 'onboarding-demo-2026';

const ADMIN = { email: 'priya.admin@example.com', fullName: 'Priya Raman' };
const MANAGERS = [
  { email: 'marcus.manager@example.com', fullName: 'Marcus Bell', department: 'Engineering' },
  { email: 'dana.manager@example.com', fullName: 'Dana Osei', department: 'Support' },
];
const RECRUITS = [
  { email: 'nadia.recruit@example.com', fullName: 'Nadia Khan', department: 'Engineering' },
  { email: 'omar.recruit@example.com', fullName: 'Omar Haddad', department: 'Engineering' },
  { email: 'lena.recruit@example.com', fullName: 'Lena Vogel', department: 'Engineering' },
  { email: 'sam.recruit@example.com', fullName: 'Sam Ortiz', department: 'Support' },
  { email: 'yuki.recruit@example.com', fullName: 'Yuki Tanaka', department: 'Support' },
  { email: 'ana.recruit@example.com', fullName: 'Ana Silva', department: 'Support' },
];

/** `daysAgo` days before today, as a date-only value. */
function dateDaysAgo(daysAgo: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

function pick<T>(values: readonly T[], index: number): T {
  return values[index % values.length] as T;
}

async function upsertUser(
  db: Db,
  passwordHash: string,
  input: {
    email: string;
    fullName: string;
    role: 'ADMIN' | 'MANAGER' | 'RECRUIT';
    department?: string;
    managerId?: string;
    startDate?: Date;
  },
): Promise<{ id: string }> {
  const data = {
    fullName: input.fullName,
    role: input.role,
    department: input.department ?? null,
    managerId: input.managerId ?? null,
    startDate: input.startDate ?? null,
    isActive: true,
  };
  return db.user.upsert({
    where: { email: input.email },
    create: { email: input.email, passwordHash, ...data },
    update: data,
    select: { id: true },
  });
}

async function seedEntriesFor(db: Db, ownerId: string, seedIndex: number): Promise<void> {
  // Entries are regenerated each run so counts stay stable and the seed is idempotent.
  await db.noteTag.deleteMany({ where: { note: { ownerId } } });
  await db.$transaction([
    db.taskEntry.deleteMany({ where: { ownerId } }),
    db.issueEntry.deleteMany({ where: { ownerId } }),
    db.feedbackNote.deleteMany({ where: { ownerId } }),
    db.note.deleteMany({ where: { ownerId } }),
  ]);

  await db.taskEntry.createMany({
    data: TASK_CATEGORIES.map((category, index) => ({
      ownerId,
      entryDate: dateDaysAgo(index * 3 + seedIndex),
      title: `${category.toLowerCase()} task ${index + 1}`,
      description: `Sample ${category.toLowerCase()} work logged during onboarding.`,
      category,
      status: pick(TASK_STATUSES, index + seedIndex),
      priority: pick(TASK_PRIORITIES, index),
    })),
  });

  await db.issueEntry.createMany({
    data: ISSUE_SEVERITIES.map((severity, index) => {
      const status = pick(ISSUE_STATUSES, index + seedIndex);
      const resolved = status === 'RESOLVED' || status === 'WONT_FIX';
      return {
        ownerId,
        entryDate: dateDaysAgo(index * 4 + seedIndex),
        title: `${severity.toLowerCase()} blocker ${index + 1}`,
        description: 'Raised while working through the onboarding checklist.',
        severity,
        status,
        resolutionNotes: resolved ? 'Closed after pairing with the buddy.' : null,
      };
    }),
  });

  await db.feedbackNote.createMany({
    data: FEEDBACK_TYPES.map((type, index) => ({
      ownerId,
      entryDate: dateDaysAgo(index * 5 + seedIndex),
      subject: `${type.toLowerCase()} feedback ${index + 1}`,
      type,
      details: 'Captured during the weekly onboarding check-in.',
    })),
  });

  for (const [index, tags] of [['setup', 'vpn'], ['training'], ['retro', 'week-1']].entries()) {
    await db.note.create({
      data: {
        ownerId,
        entryDate: dateDaysAgo(index * 6 + seedIndex),
        title: `Onboarding note ${index + 1}`,
        content: 'Free-form notes taken during onboarding.',
        tags: {
          create: tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
      },
    });
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl === undefined) throw new Error('DATABASE_URL is required to seed');

  const db = createPrismaClient(databaseUrl);
  const passwordHash = await hashPassword(SEED_PASSWORD);

  try {
    await upsertUser(db, passwordHash, { ...ADMIN, role: 'ADMIN' });

    const managers = [];
    for (const manager of MANAGERS) {
      managers.push(await upsertUser(db, passwordHash, { ...manager, role: 'MANAGER' }));
    }

    for (const [index, recruit] of RECRUITS.entries()) {
      const manager = managers[index % managers.length];
      const user = await upsertUser(db, passwordHash, {
        ...recruit,
        role: 'RECRUIT',
        ...(manager === undefined ? {} : { managerId: manager.id }),
        startDate: dateDaysAgo(30 - index * 3),
      });
      await seedEntriesFor(db, user.id, index);
    }

    const [users, tasks, issues, feedback, notes] = await Promise.all([
      db.user.count(),
      db.taskEntry.count(),
      db.issueEntry.count(),
      db.feedbackNote.count(),
      db.note.count(),
    ]);
    console.warn(
      `Seed complete: ${users} users, ${tasks} tasks, ${issues} issues, ${feedback} feedback notes, ${notes} notes.`,
    );
  } finally {
    await db.$disconnect();
  }
}

await main();
