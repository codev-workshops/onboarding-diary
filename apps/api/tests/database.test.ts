import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { calendarDate, createUser } from './helpers/factories.js';

const db = getTestDb();

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('User persistence', () => {
  it('stores and reads back a user', async () => {
    const created = await createUser({ email: 'reader@example.com', fullName: 'Read Back' });
    const found = await db.user.findUnique({ where: { email: 'reader@example.com' } });
    expect(found?.id).toBe(created.id);
    expect(found?.role).toBe('RECRUIT');
    expect(found?.isActive).toBe(true);
  });

  it('treats email as case-insensitive', async () => {
    await createUser({ email: 'Mixed.Case@Example.com' });
    const found = await db.user.findUnique({ where: { email: 'mixed.case@example.com' } });
    expect(found).not.toBeNull();
    await expect(createUser({ email: 'MIXED.CASE@example.com' })).rejects.toThrow();
  });

  it('refuses a user who manages themselves', async () => {
    const user = await createUser();
    await expect(
      db.user.update({ where: { id: user.id }, data: { managerId: user.id } }),
    ).rejects.toThrow(/User_managerId_not_self/);
  });

  it('clears managerId when the manager row is deleted', async () => {
    const manager = await createUser({ role: 'MANAGER' });
    const recruit = await createUser({ managerId: manager.id });
    await db.user.delete({ where: { id: manager.id } });
    const reloaded = await db.user.findUnique({ where: { id: recruit.id } });
    expect(reloaded?.managerId).toBeNull();
  });
});

describe('Entry persistence', () => {
  it('applies the documented defaults', async () => {
    const owner = await createUser();
    const task = await db.taskEntry.create({
      data: { ownerId: owner.id, entryDate: calendarDate(), title: 'Set up laptop' },
    });
    const issue = await db.issueEntry.create({
      data: { ownerId: owner.id, entryDate: calendarDate(), title: 'Laptop is slow' },
    });
    expect(task).toMatchObject({
      category: 'OTHER',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
    });
    expect(issue).toMatchObject({ severity: 'MEDIUM', status: 'OPEN' });
  });

  it('stores entryDate as a plain calendar date', async () => {
    const owner = await createUser();
    const task = await db.taskEntry.create({
      data: { ownerId: owner.id, entryDate: new Date('2026-03-01'), title: 'Read the handbook' },
    });
    expect(task.entryDate.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('requires a feedback type', async () => {
    const owner = await createUser();
    await expect(
      db.$executeRawUnsafe(
        'INSERT INTO "FeedbackNote" ("id", "ownerId", "entryDate", "subject", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1::uuid, CURRENT_DATE, $2, now(), now())',
        owner.id,
        'Missing type',
      ),
    ).rejects.toThrow();
  });

  it('refuses to delete a user who still owns entries', async () => {
    const owner = await createUser();
    await db.taskEntry.create({
      data: { ownerId: owner.id, entryDate: calendarDate(), title: 'Keeps the user alive' },
    });
    await expect(db.user.delete({ where: { id: owner.id } })).rejects.toThrow();
  });
});

describe('Note tagging', () => {
  it('keeps tag names unique and cascades join rows when a note is deleted', async () => {
    const owner = await createUser();
    const note = await db.note.create({
      data: {
        ownerId: owner.id,
        entryDate: calendarDate(),
        title: 'Week one',
        tags: {
          create: [
            { tag: { connectOrCreate: { where: { name: 'setup' }, create: { name: 'setup' } } } },
            { tag: { connectOrCreate: { where: { name: 'vpn' }, create: { name: 'vpn' } } } },
          ],
        },
      },
    });

    expect(await db.noteTag.count({ where: { noteId: note.id } })).toBe(2);

    await db.note.delete({ where: { id: note.id } });

    expect(await db.noteTag.count()).toBe(0);
    expect(await db.tag.count()).toBe(2);
    await expect(db.tag.create({ data: { name: 'setup' } })).rejects.toThrow();
  });
});

describe('RefreshToken persistence', () => {
  it('enforces hash uniqueness and cascades on user deletion', async () => {
    const user = await createUser();
    const expiresAt = new Date(Date.now() + 60_000);
    await db.refreshToken.create({ data: { userId: user.id, tokenHash: 'hash-1', expiresAt } });
    await expect(
      db.refreshToken.create({ data: { userId: user.id, tokenHash: 'hash-1', expiresAt } }),
    ).rejects.toThrow();

    await db.user.delete({ where: { id: user.id } });
    expect(await db.refreshToken.count()).toBe(0);
  });
});
