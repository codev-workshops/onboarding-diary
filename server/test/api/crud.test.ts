import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';

// Bind the app's Prisma singleton to an isolated SQLite DB before importing it.
const dir = mkdtempSync(join(tmpdir(), 'onboarding-crud-'));
const url = `file:${join(dir, 'crud.db')}`;
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
let categoryId: string;

async function token(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

function auth(t: string) {
  return { Authorization: `Bearer ${t}` };
}

beforeAll(() => {
  app = createApp();
  db = prisma;
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await db.comment.deleteMany();
  await db.mention.deleteMany();
  await db.task.deleteMany();
  await db.issue.deleteMany();
  await db.feedback.deleteMany();
  await db.note.deleteMany();
  await db.checklistItem.deleteMany();
  await db.checklistTemplate.deleteMany();
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

describe('tasks filters (date / category / status)', () => {
  it('filters the task log by date, category and status', async () => {
    const t = await token('recruita@t.local');
    const other = await request(app).post('/api/categories').set(auth(await token('admin@t.local'))).send({ name: 'Meeting' });
    const otherCategoryId = other.body.id as string;

    await request(app)
      .post('/api/tasks')
      .set(auth(t))
      .send({ date: '2026-01-01', title: 'A', description: '', categoryId, status: 'Done', priority: 'Low' });
    await request(app)
      .post('/api/tasks')
      .set(auth(t))
      .send({ date: '2026-02-02', title: 'B', description: '', categoryId: otherCategoryId, status: 'To Do', priority: 'Low' });

    expect((await request(app).get('/api/tasks?date=2026-01-01').set(auth(t))).body).toHaveLength(1);
    expect((await request(app).get(`/api/tasks?categoryId=${otherCategoryId}`).set(auth(t))).body).toHaveLength(1);
    expect((await request(app).get('/api/tasks?status=Done').set(auth(t))).body).toHaveLength(1);
    expect((await request(app).get('/api/tasks').set(auth(t))).body).toHaveLength(2);
  });

  it('returns 404 getting a missing task', async () => {
    const t = await token('recruita@t.local');
    expect((await request(app).get('/api/tasks/missing').set(auth(t))).status).toBe(404);
  });
});

describe('user management edge cases (admin-only)', () => {
  it('rejects an email collision, updates a password, and deletes a user', async () => {
    const admin = await token('admin@t.local');
    const created = await request(app)
      .post('/api/users')
      .set(auth(admin))
      .send({ email: 'edge@t.local', password: 'password123', name: 'Edge', role: 'Recruit', startDate: '2026-01-01' });
    const id = created.body.id as string;

    const collision = await request(app)
      .put(`/api/users/${id}`)
      .set(auth(admin))
      .send({ email: 'admin@t.local' });
    expect(collision.status).toBe(409);

    const pw = await request(app).put(`/api/users/${id}`).set(auth(admin)).send({ password: 'newpassword1' });
    expect(pw.status).toBe(200);

    expect((await request(app).delete(`/api/users/${id}`).set(auth(admin))).status).toBe(204);
    expect((await request(app).delete('/api/users/missing').set(auth(admin))).status).toBe(404);
    expect((await request(app).put('/api/users/missing').set(auth(admin)).send({ name: 'x' })).status).toBe(404);
  });
});

describe('notes CRUD, filters & access scoping', () => {
  it('creates, filters by tag, gets, updates and deletes a note', async () => {
    const t = await token('recruita@t.local');
    const created = await request(app)
      .post('/api/notes')
      .set(auth(t))
      .send({ date: '2026-01-01', title: 'Note 1', content: 'body', tags: ['welcome', 'week1'] });
    expect(created.status).toBe(201);
    expect(created.body.tags).toEqual(['welcome', 'week1']);
    const id = created.body.id as string;

    const filtered = await request(app).get('/api/notes?tag=week1').set(auth(t));
    expect(filtered.body).toHaveLength(1);
    const missFilter = await request(app).get('/api/notes?tag=nope').set(auth(t));
    expect(missFilter.body).toHaveLength(0);

    const got = await request(app).get(`/api/notes/${id}`).set(auth(t));
    expect(got.body.title).toBe('Note 1');

    const updated = await request(app)
      .put(`/api/notes/${id}`)
      .set(auth(t))
      .send({ title: 'Renamed', tags: ['x'] });
    expect(updated.body.title).toBe('Renamed');
    expect(updated.body.tags).toEqual(['x']);

    const del = await request(app).delete(`/api/notes/${id}`).set(auth(t));
    expect(del.status).toBe(204);
  });

  it('returns 404 for a missing note and forbids access to another recruit note', async () => {
    const t = await token('recruita@t.local');
    const created = await request(app)
      .post('/api/notes')
      .set(auth(t))
      .send({ date: '2026-01-01', title: 'Mine', content: '', tags: [] });
    const id = created.body.id as string;

    const other = await token('recruitb@t.local');
    expect((await request(app).get(`/api/notes/${id}`).set(auth(other))).status).toBe(403);
    expect((await request(app).get('/api/notes/missing').set(auth(t))).status).toBe(404);
  });
});

describe('feedback CRUD & filters', () => {
  it('creates, filters by type, gets, updates and deletes feedback', async () => {
    const t = await token('recruita@t.local');
    const created = await request(app)
      .post('/api/feedback')
      .set(auth(t))
      .send({ date: '2026-01-01', subject: 'Great week', type: 'Positive', details: 'went well' });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    await request(app)
      .post('/api/feedback')
      .set(auth(t))
      .send({ date: '2026-01-02', subject: 'Idea', type: 'Suggestion', details: '' });

    const positives = await request(app).get('/api/feedback?type=Positive').set(auth(t));
    expect(positives.body).toHaveLength(1);
    expect((await request(app).get('/api/feedback').set(auth(t))).body).toHaveLength(2);

    expect((await request(app).get(`/api/feedback/${id}`).set(auth(t))).body.subject).toBe('Great week');
    const updated = await request(app)
      .put(`/api/feedback/${id}`)
      .set(auth(t))
      .send({ type: 'Concern' });
    expect(updated.body.type).toBe('Concern');
    expect((await request(app).delete(`/api/feedback/${id}`).set(auth(t))).status).toBe(204);
    expect((await request(app).get('/api/feedback/missing').set(auth(t))).status).toBe(404);
  });
});

describe('issues CRUD & filters', () => {
  it('creates, filters by status/severity, updates resolution and deletes an issue', async () => {
    const t = await token('recruita@t.local');
    const created = await request(app)
      .post('/api/issues')
      .set(auth(t))
      .send({ date: '2026-01-01', title: 'Broken laptop', description: '', severity: 'High', status: 'Open' });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    const open = await request(app).get('/api/issues?status=Open').set(auth(t));
    expect(open.body).toHaveLength(1);
    const high = await request(app).get('/api/issues?severity=High').set(auth(t));
    expect(high.body).toHaveLength(1);
    const critical = await request(app).get('/api/issues?severity=Critical').set(auth(t));
    expect(critical.body).toHaveLength(0);

    expect((await request(app).get(`/api/issues/${id}`).set(auth(t))).body.title).toBe('Broken laptop');
    const updated = await request(app)
      .put(`/api/issues/${id}`)
      .set(auth(t))
      .send({ status: 'Resolved', resolutionNotes: 'Replaced' });
    expect(updated.body.status).toBe('Resolved');
    expect(updated.body.resolutionNotes).toBe('Replaced');
    expect((await request(app).delete(`/api/issues/${id}`).set(auth(t))).status).toBe(204);
    expect((await request(app).get('/api/issues/missing').set(auth(t))).status).toBe(404);
  });
});

describe('departments management (admin-only)', () => {
  it('creates, lists, renames and deletes a department; enforces conflicts and guards', async () => {
    const admin = await token('admin@t.local');
    const created = await request(app).post('/api/departments').set(auth(admin)).send({ name: 'Design' });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    const dup = await request(app).post('/api/departments').set(auth(admin)).send({ name: 'Design' });
    expect(dup.status).toBe(409);

    const list = await request(app).get('/api/departments').set(auth(admin));
    expect(list.body.map((d: { name: string }) => d.name)).toEqual(
      expect.arrayContaining(['Engineering', 'Design']),
    );

    const renamed = await request(app).put(`/api/departments/${id}`).set(auth(admin)).send({ name: 'Product' });
    expect(renamed.body.name).toBe('Product');
    const renameConflict = await request(app)
      .put(`/api/departments/${id}`)
      .set(auth(admin))
      .send({ name: 'Engineering' });
    expect(renameConflict.status).toBe(409);
    expect((await request(app).put('/api/departments/missing').set(auth(admin)).send({ name: 'X' })).status).toBe(404);

    expect((await request(app).delete(`/api/departments/${id}`).set(auth(admin))).status).toBe(204);
    expect((await request(app).delete('/api/departments/missing').set(auth(admin))).status).toBe(404);
  });

  it('forbids non-admins from managing departments', async () => {
    const recruit = await token('recruita@t.local');
    expect((await request(app).post('/api/departments').set(auth(recruit)).send({ name: 'Nope' })).status).toBe(403);
  });
});

describe('categories management (admin-only)', () => {
  it('creates, renames, reactivates, hard-deletes unused and rejects conflicts', async () => {
    const admin = await token('admin@t.local');
    const created = await request(app).post('/api/categories').set(auth(admin)).send({ name: 'Training' });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    const dup = await request(app).post('/api/categories').set(auth(admin)).send({ name: 'Training' });
    expect(dup.status).toBe(409);

    const renamed = await request(app).put(`/api/categories/${id}`).set(auth(admin)).send({ name: 'Onboarding' });
    expect(renamed.body.name).toBe('Onboarding');

    const disabled = await request(app).put(`/api/categories/${id}`).set(auth(admin)).send({ isActive: false });
    expect(disabled.body.isActive).toBe(false);
    const withInactive = await request(app).get('/api/categories?includeInactive=true').set(auth(admin));
    expect(withInactive.body.map((c: { name: string }) => c.name)).toContain('Onboarding');

    const del = await request(app).delete(`/api/categories/${id}`).set(auth(admin));
    expect(del.body.softDisabled).toBe(false);
    expect((await request(app).put('/api/categories/missing').set(auth(admin)).send({ name: 'X' })).status).toBe(404);
    expect((await request(app).delete('/api/categories/missing').set(auth(admin))).status).toBe(404);
  });
});

describe('checklist templates management (admin-only)', () => {
  it('creates, gets, lists, updates and deletes a template', async () => {
    const admin = await token('admin@t.local');
    const dept = await request(app).post('/api/departments').set(auth(admin)).send({ name: 'Ops' });
    const created = await request(app)
      .post('/api/templates')
      .set(auth(admin))
      .send({
        name: 'Ops onboarding',
        description: 'first week',
        role: 'Recruit',
        departmentId: dept.body.id,
        items: [{ title: 'Read handbook', priority: 'Medium', dueOffsetDays: 2, categoryId }],
      });
    expect(created.status).toBe(201);
    expect(created.body.items).toHaveLength(1);
    const id = created.body.id as string;

    expect((await request(app).get(`/api/templates/${id}`).set(auth(admin))).body.name).toBe('Ops onboarding');
    expect((await request(app).get('/api/templates').set(auth(admin))).body).toHaveLength(1);

    const updated = await request(app)
      .put(`/api/templates/${id}`)
      .set(auth(admin))
      .send({ name: 'Ops v2', items: [{ title: 'Meet team', priority: 'Low', dueOffsetDays: 0 }] });
    expect(updated.body.name).toBe('Ops v2');
    expect(updated.body.items).toHaveLength(1);
    expect(updated.body.items[0].title).toBe('Meet team');

    expect((await request(app).delete(`/api/templates/${id}`).set(auth(admin))).status).toBe(204);
    expect((await request(app).get('/api/templates/missing').set(auth(admin))).status).toBe(404);
  });

  it('rejects a template pointing at a non-existent department and forbids non-admins', async () => {
    const admin = await token('admin@t.local');
    const bad = await request(app)
      .post('/api/templates')
      .set(auth(admin))
      .send({ name: 'Bad', departmentId: 'nope', items: [] });
    expect(bad.status).toBe(400);

    const recruit = await token('recruita@t.local');
    expect((await request(app).get('/api/templates').set(auth(recruit))).status).toBe(403);
  });
});

describe('reports export (on-screen, CSV, PDF)', () => {
  beforeEach(async () => {
    const t = await token('recruita@t.local');
    await request(app)
      .post('/api/tasks')
      .set(auth(t))
      .send({ date: '2026-01-05', title: 'Task', description: '', categoryId, status: 'Done', priority: 'High' });
    await request(app)
      .post('/api/issues')
      .set(auth(t))
      .send({ date: '2026-01-06', title: 'Issue', description: '', severity: 'Low', status: 'Open' });
    await request(app)
      .post('/api/feedback')
      .set(auth(t))
      .send({ date: '2026-01-07', subject: 'Fb', type: 'Positive', details: '' });
    await request(app)
      .post('/api/notes')
      .set(auth(t))
      .send({ date: '2026-01-08', title: 'Note', content: '', tags: [] });
  });

  it('renders on-screen data and exports a valid PDF and CSV', async () => {
    const t = await token('recruita@t.local');
    const q = 'start=2026-01-01&end=2026-01-31';

    const json = await request(app).get(`/api/reports?${q}`).set(auth(t));
    expect(json.body.summary.taskTotal).toBe(1);

    const pdf = await request(app).get(`/api/reports/export.pdf?${q}`).set(auth(t)).buffer(true);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.body.slice(0, 4).toString()).toBe('%PDF');

    const csv = await request(app).get(`/api/reports/export.csv?${q}`).set(auth(t));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');

    const badRange = await request(app)
      .get('/api/reports?start=2026-02-01&end=2026-01-01')
      .set(auth(t));
    expect(badRange.status).toBe(400);
  });
});

describe('task comments & @mention notifications', () => {
  async function seedTaskOwnedByRecruitA(): Promise<string> {
    const t = await token('recruita@t.local');
    const created = await request(app)
      .post('/api/tasks')
      .set(auth(t))
      .send({ date: '2026-01-01', title: 'Shared task', description: '', categoryId, status: 'To Do', priority: 'Low' });
    return created.body.id as string;
  }

  it('posts a comment mentioning the manager and lets them read/clear the mention', async () => {
    const taskId = await seedTaskOwnedByRecruitA();
    const recruit = await token('recruita@t.local');
    const posted = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set(auth(recruit))
      .send({ body: 'Need help @manager' });
    expect(posted.status).toBe(201);
    expect(posted.body.mentions).toHaveLength(1);

    const comments = await request(app).get(`/api/tasks/${taskId}/comments`).set(auth(recruit));
    expect(comments.body).toHaveLength(1);

    const manager = await token('manager@t.local');
    const mentions = await request(app).get('/api/mentions').set(auth(manager));
    expect(mentions.body.unread).toBe(1);
    const mentionId = mentions.body.items[0].id as string;

    expect((await request(app).post(`/api/mentions/${mentionId}/read`).set(auth(manager))).status).toBe(204);
    expect((await request(app).get('/api/mentions').set(auth(manager))).body.unread).toBe(0);
  });

  it('marks all mentions read and ignores unmatched mention handles', async () => {
    const taskId = await seedTaskOwnedByRecruitA();
    const recruit = await token('recruita@t.local');
    await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set(auth(recruit))
      .send({ body: 'ping @manager and @nobody' });

    const manager = await token('manager@t.local');
    expect((await request(app).get('/api/mentions').set(auth(manager))).body.unread).toBe(1);
    expect((await request(app).post('/api/mentions/read').set(auth(manager))).status).toBe(204);
    expect((await request(app).get('/api/mentions').set(auth(manager))).body.unread).toBe(0);
  });

  it('forbids commenting on a task outside the actor access scope', async () => {
    const taskId = await seedTaskOwnedByRecruitA();
    const other = await token('recruitb@t.local');
    expect((await request(app).get(`/api/tasks/${taskId}/comments`).set(auth(other))).status).toBe(403);
    expect(
      (await request(app).post(`/api/tasks/${taskId}/comments`).set(auth(other)).send({ body: 'hi' })).status,
    ).toBe(403);
  });
});
