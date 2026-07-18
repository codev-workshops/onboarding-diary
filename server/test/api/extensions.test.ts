import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';

// Isolated SQLite DB, bound before the app's Prisma singleton is imported.
const dir = mkdtempSync(join(tmpdir(), 'onboarding-ext-'));
const url = `file:${join(dir, 'ext.db')}`;
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = 'test-secret';
// Demo mode is derived from the absence of DB_STRING; clear it in case a prior
// test in the same worker set it (docs/ASSUMPTIONS.md §13).
delete process.env.DB_STRING;
execSync('npx prisma db push --skip-generate --accept-data-loss', {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: url },
  stdio: 'ignore',
});

const { createApp } = await import('../../src/app.js');
const { prisma } = await import('../../src/db/prisma.js');
const { hashPassword } = await import('../../src/auth/password.js');

let app: Express;
let db: PrismaClient;

async function token(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

let managerId: string;
let recruitAId: string;
let categoryId: string;

beforeAll(() => {
  app = createApp();
  db = prisma;
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await db.mention.deleteMany();
  await db.comment.deleteMany();
  await db.checklistItem.deleteMany();
  await db.checklistTemplate.deleteMany();
  await db.task.deleteMany();
  await db.taskCategory.deleteMany();
  await db.user.deleteMany();
  await db.department.deleteMany();

  const passwordHash = await hashPassword('password123');
  const dept = await db.department.create({ data: { name: 'Engineering' } });
  await db.user.create({
    data: { email: 'admin@t.local', passwordHash, name: 'Admin', role: 'Admin', startDate: new Date() },
  });
  const manager = await db.user.create({
    data: {
      email: 'manager@t.local',
      passwordHash,
      name: 'Manager',
      role: 'Manager',
      startDate: new Date(),
      departmentId: dept.id,
    },
  });
  managerId = manager.id;
  const recruitA = await db.user.create({
    data: {
      email: 'recruita@t.local',
      passwordHash,
      name: 'Recruit A',
      role: 'Recruit',
      startDate: new Date('2026-01-01'),
      departmentId: dept.id,
      managerId: manager.id,
    },
  });
  recruitAId = recruitA.id;
  await db.user.create({
    data: {
      email: 'recruitb@t.local',
      passwordHash,
      name: 'Recruit B',
      role: 'Recruit',
      startDate: new Date(),
      departmentId: dept.id,
    },
  });
  const category = await db.taskCategory.create({ data: { name: 'Setup' } });
  categoryId = category.id;
});

describe('checklist templates (§17)', () => {
  it('is admin-only', async () => {
    const recruitToken = await token('recruita@t.local');
    const res = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${recruitToken}`);
    expect(res.status).toBe(403);
  });

  it('creates a template and seeds a recruit Task Log on provisioning', async () => {
    const adminToken = await token('admin@t.local');
    const created = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Engineering onboarding',
        role: 'Recruit',
        items: [
          { title: 'Set up laptop', priority: 'High', dueOffsetDays: 1, categoryId },
          { title: 'Read docs', priority: 'Low', dueOffsetDays: 7 },
        ],
      });
    expect(created.status).toBe(201);
    expect(created.body.items).toHaveLength(2);
    const templateId = created.body.id as string;

    const provisioned = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'seeded@t.local',
        password: 'password123',
        name: 'Seeded Recruit',
        role: 'Recruit',
        startDate: '2026-03-01',
        managerId,
        templateId,
      });
    expect(provisioned.status).toBe(201);

    const seededUser = await db.user.findUnique({ where: { email: 'seeded@t.local' } });
    const tasks = await db.task.findMany({ where: { ownerId: seededUser?.id } });
    expect(tasks).toHaveLength(2);
    const laptop = tasks.find((t) => t.title === 'Set up laptop');
    expect(laptop?.status).toBe('To Do');
    // dueDate = startDate (2026-03-01) + 1 day.
    expect(laptop?.dueDate?.toISOString().slice(0, 10)).toBe('2026-03-02');
  });
});

describe('task due dates & overdue reminders (§18)', () => {
  it('stores a due date and counts overdue tasks on the dashboard', async () => {
    const recruitToken = await token('recruita@t.local');
    // Past-due, not done -> overdue.
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({
        date: '2026-01-01',
        title: 'Overdue task',
        description: '',
        categoryId,
        status: 'To Do',
        priority: 'High',
        dueDate: '2020-01-01',
      });
    // Past-due but done -> not overdue.
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({
        date: '2026-01-01',
        title: 'Done task',
        description: '',
        categoryId,
        status: 'Done',
        priority: 'Low',
        dueDate: '2020-01-01',
      });

    const dash = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${recruitToken}`);
    expect(dash.body.tasks.overdue).toBe(1);

    const managerToken = await token('manager@t.local');
    const team = await request(app)
      .get('/api/dashboard/team')
      .set('Authorization', `Bearer ${managerToken}`);
    const row = (team.body.recruits as { id: string; overdue: number }[]).find(
      (r) => r.id === recruitAId,
    );
    expect(row?.overdue).toBe(1);
    expect(team.body.totals.overdue).toBe(1);
  });
});

describe('comments with @mentions (§19)', () => {
  async function createRecruitTask(): Promise<string> {
    const recruitToken = await token('recruita@t.local');
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({
        date: '2026-01-01',
        title: 'Task',
        description: '',
        categoryId,
        status: 'To Do',
        priority: 'Low',
      });
    return res.body.id as string;
  }

  it('creates a comment, records a mention, and notifies the mentioned user', async () => {
    const taskId = await createRecruitTask();
    const recruitToken = await token('recruita@t.local');
    const comment = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({ body: 'Please help @manager here' });
    expect(comment.status).toBe(201);
    expect(comment.body.mentions).toHaveLength(1);

    // The manager sees the mention and an unread count.
    const managerToken = await token('manager@t.local');
    const mentions = await request(app)
      .get('/api/mentions')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(mentions.body.unread).toBe(1);
    expect(mentions.body.items).toHaveLength(1);

    // Mark read clears the count.
    const read = await request(app)
      .post('/api/mentions/read')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(read.status).toBe(204);
    const after = await request(app)
      .get('/api/mentions')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(after.body.unread).toBe(0);
  });

  it('forbids commenting on a task outside the actor scope', async () => {
    const taskId = await createRecruitTask();
    const otherToken = await token('recruitb@t.local');
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ body: 'sneaky' });
    expect(res.status).toBe(403);
  });

  it('does not create a mention for the comment author', async () => {
    const taskId = await createRecruitTask();
    const recruitToken = await token('recruita@t.local');
    const comment = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({ body: 'note to self @recruita' });
    expect(comment.status).toBe(201);
    expect(comment.body.mentions).toHaveLength(0);
  });
});
