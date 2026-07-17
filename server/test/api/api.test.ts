import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';

// Bind the app's Prisma singleton to an isolated SQLite DB before importing it.
const dir = mkdtempSync(join(tmpdir(), 'onboarding-api-'));
const url = `file:${join(dir, 'api.db')}`;
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = 'test-secret';
process.env.DEMO_MODE = 'true';
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

async function reset(): Promise<void> {
  await db.task.deleteMany();
  await db.issue.deleteMany();
  await db.feedback.deleteMany();
  await db.note.deleteMany();
  await db.taskCategory.deleteMany();
  await db.user.deleteMany();
  await db.department.deleteMany();
}

async function token(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

beforeAll(() => {
  app = createApp();
  db = prisma;
});

afterAll(async () => {
  await db.$disconnect();
});

let managerId: string;
let categoryId: string;

beforeEach(async () => {
  await reset();
  const passwordHash = await hashPassword('password123');
  const dept = await db.department.create({ data: { name: 'Engineering' } });
  await db.user.create({
    data: {
      email: 'admin@t.local',
      passwordHash,
      name: 'Admin',
      role: 'Admin',
      startDate: new Date(),
    },
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
  await db.user.create({
    data: {
      email: 'recruita@t.local',
      passwordHash,
      name: 'Recruit A',
      role: 'Recruit',
      startDate: new Date(),
      departmentId: dept.id,
      managerId: manager.id,
    },
  });
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

describe('health & config', () => {
  it('reports health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('exposes runtime config', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('onboardingEnablersEnabled');
  });

  it('exposes demo credentials only in demo mode (default), scoped to @demo.local', async () => {
    const res = await request(app).get('/api/config/demo');
    expect(res.status).toBe(200);
    expect(res.body.password).toBeTruthy();
    expect(Array.isArray(res.body.accounts)).toBe(true);
    expect(res.body.accounts.length).toBeGreaterThan(0);
    for (const account of res.body.accounts as { email: string }[]) {
      expect(account.email.endsWith('@demo.local')).toBe(true);
    }
  });
});

describe('auth', () => {
  it('rejects bad credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@t.local', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('logs in and returns the current user via /me', async () => {
    const t = await token('admin@t.local');
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${t}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('admin@t.local');
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('blocks unauthenticated access to protected routes', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
  });
});

describe('user provisioning (admin-only)', () => {
  it('lets an admin create a user but forbids a recruit', async () => {
    const adminToken = await token('admin@t.local');
    const created = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new@t.local',
        password: 'password123',
        name: 'New User',
        role: 'Recruit',
        startDate: '2026-01-01',
        managerId,
      });
    expect(created.status).toBe(201);

    const recruitToken = await token('recruita@t.local');
    const forbidden = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({
        email: 'x@t.local',
        password: 'password123',
        name: 'X',
        role: 'Recruit',
        startDate: '2026-01-01',
      });
    expect(forbidden.status).toBe(403);
  });

  it('enforces the password policy', async () => {
    const adminToken = await token('admin@t.local');
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'weak@t.local',
        password: 'short',
        name: 'Weak',
        role: 'Recruit',
        startDate: '2026-01-01',
      });
    expect(res.status).toBe(400);
  });
});

describe('tasks CRUD & access scoping', () => {
  it('creates, lists, updates and deletes a task for its owner', async () => {
    const t = await token('recruita@t.local');
    const created = await request(app).post('/api/tasks').set('Authorization', `Bearer ${t}`).send({
      date: '2026-01-01',
      title: 'Task 1',
      description: 'do it',
      categoryId,
      status: 'To Do',
      priority: 'Low',
    });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    const list = await request(app).get('/api/tasks').set('Authorization', `Bearer ${t}`);
    expect(list.body).toHaveLength(1);

    const updated = await request(app)
      .put(`/api/tasks/${id}`)
      .set('Authorization', `Bearer ${t}`)
      .send({ status: 'Done' });
    expect(updated.body.status).toBe('Done');

    const del = await request(app).delete(`/api/tasks/${id}`).set('Authorization', `Bearer ${t}`);
    expect(del.status).toBe(204);
  });

  it('scopes visibility: recruit sees own; manager sees overseen; other recruit does not', async () => {
    const recruitToken = await token('recruita@t.local');
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({
        date: '2026-01-01',
        title: 'Mine',
        description: '',
        categoryId,
        status: 'To Do',
        priority: 'Low',
      });

    const managerToken = await token('manager@t.local');
    const managerList = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(managerList.body.map((x: { title: string }) => x.title)).toContain('Mine');

    const otherToken = await token('recruitb@t.local');
    const otherList = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherList.body).toHaveLength(0);
  });

  it('rejects an inactive/invalid category', async () => {
    const t = await token('recruita@t.local');
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${t}`)
      .send({
        date: '2026-01-01',
        title: 'x',
        description: '',
        categoryId: 'nope',
        status: 'To Do',
        priority: 'Low',
      });
    expect(res.status).toBe(400);
  });
});

describe('categories soft-disable', () => {
  it('soft-disables an in-use category instead of deleting it', async () => {
    const recruitToken = await token('recruita@t.local');
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({
        date: '2026-01-01',
        title: 'x',
        description: '',
        categoryId,
        status: 'To Do',
        priority: 'Low',
      });

    const adminToken = await token('admin@t.local');
    const res = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.softDisabled).toBe(true);

    const cat = await db.taskCategory.findUnique({ where: { id: categoryId } });
    expect(cat?.isActive).toBe(false);
  });
});

describe('dashboard & reports', () => {
  beforeEach(async () => {
    const recruitToken = await token('recruita@t.local');
    for (const status of ['To Do', 'Done']) {
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${recruitToken}`)
        .send({
          date: '2026-01-01',
          title: status,
          description: '',
          categoryId,
          status,
          priority: 'Low',
        });
    }
    await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${recruitToken}`)
      .send({
        date: '2026-01-01',
        title: 'issue',
        description: '',
        severity: 'High',
        status: 'Open',
      });
  });

  it('summarizes tasks and issues with correct semantics', async () => {
    const t = await token('recruita@t.local');
    const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${t}`);
    expect(res.body.tasks.total).toBe(2);
    expect(res.body.tasks.completed).toBe(1);
    expect(res.body.tasks.completionRate).toBe(50);
    expect(res.body.issues.open).toBe(1);
  });

  it('builds a report and exports matching CSV', async () => {
    const t = await token('recruita@t.local');
    const q = 'start=2026-01-01&end=2026-01-31';
    const json = await request(app).get(`/api/reports?${q}`).set('Authorization', `Bearer ${t}`);
    expect(json.body.summary.taskTotal).toBe(2);

    const csv = await request(app)
      .get(`/api/reports/export.csv?${q}`)
      .set('Authorization', `Bearer ${t}`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('Task');
  });

  it('forbids a manager reporting on a recruit they do not oversee', async () => {
    const managerToken = await token('manager@t.local');
    const res = await request(app)
      .get('/api/reports?start=2026-01-01&end=2026-01-31&recruitId=nope')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(403);
  });

  it('builds a manager team overview scoped to overseen recruits', async () => {
    const managerToken = await token('manager@t.local');
    const res = await request(app)
      .get('/api/dashboard/team')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    const names = (res.body.recruits as { name: string }[]).map((r) => r.name);
    expect(names).toContain('Recruit A');
    expect(names).not.toContain('Recruit B');
    const rina = (
      res.body.recruits as { name: string; taskTotal: number; taskCompleted: number }[]
    ).find((r) => r.name === 'Recruit A');
    expect(rina?.taskTotal).toBe(2);
    expect(rina?.taskCompleted).toBe(1);
  });

  it('lets an admin see all recruits in the team overview', async () => {
    const adminToken = await token('admin@t.local');
    const res = await request(app)
      .get('/api/dashboard/team')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const names = (res.body.recruits as { name: string }[]).map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['Recruit A', 'Recruit B']));
  });

  it('forbids a recruit from the team overview', async () => {
    const recruitToken = await token('recruita@t.local');
    const res = await request(app)
      .get('/api/dashboard/team')
      .set('Authorization', `Bearer ${recruitToken}`);
    expect(res.status).toBe(403);
  });
});
