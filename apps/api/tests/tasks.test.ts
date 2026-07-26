import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { authenticatedAs, bearer, buildTestApp } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createTask, createUser } from './helpers/factories.js';

const testApp = buildTestApp();
const { agent, basePath } = testApp;
const db = getTestDb();
const today = new Date().toISOString().slice(0, 10);

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('POST /tasks', () => {
  it('creates a task owned by the caller and applies the defaults', async () => {
    const { user, token } = await authenticatedAs(testApp);
    const response = await agent
      .post(`${basePath}/tasks`)
      .set(...bearer(token))
      .send({ entryDate: today, title: '  Complete VPN setup  ' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      ownerId: user.id,
      entryDate: today,
      title: 'Complete VPN setup',
      category: 'OTHER',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      description: null,
    });
  });

  it('ignores an ownerId supplied in the body', async () => {
    const { user, token } = await authenticatedAs(testApp);
    const other = await createUser();
    const response = await agent
      .post(`${basePath}/tasks`)
      .set(...bearer(token))
      .send({ entryDate: today, title: 'Spoofed', ownerId: other.id });

    expect(response.status).toBe(201);
    expect(response.body.data.ownerId).toBe(user.id);
  });

  it('rejects a missing title and a future entry date', async () => {
    const { token } = await authenticatedAs(testApp);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    const noTitle = await agent
      .post(`${basePath}/tasks`)
      .set(...bearer(token))
      .send({ entryDate: today });
    expect(noTitle.status).toBe(422);
    expect(noTitle.body.error.details.map((d: { field: string }) => d.field)).toContain('title');

    const future = await agent
      .post(`${basePath}/tasks`)
      .set(...bearer(token))
      .send({ entryDate: tomorrow, title: 'Later' });
    expect(future.status).toBe(422);
    expect(future.body.error.details[0].field).toBe('entryDate');
  });
});

describe('GET /tasks/:id', () => {
  it("hides another recruit's task", async () => {
    const { token } = await authenticatedAs(testApp);
    const other = await createUser();
    const task = await createTask(other.id);

    const response = await agent.get(`${basePath}/tasks/${task.id}`).set(...bearer(token));
    expect(response.status).toBe(403);
  });

  it("lets a manager read a direct report's task", async () => {
    const manager = await authenticatedAs(testApp, 'MANAGER');
    const report = await createUser({ managerId: manager.user.id });
    const task = await createTask(report.id);

    const response = await agent.get(`${basePath}/tasks/${task.id}`).set(...bearer(manager.token));
    expect(response.status).toBe(200);
    expect(response.body.data.ownerId).toBe(report.id);
  });
});

describe('GET /tasks', () => {
  it('filters, paginates, and orders newest first', async () => {
    const { user, token } = await authenticatedAs(testApp);
    await db.taskEntry.createMany({
      data: [
        {
          ownerId: user.id,
          entryDate: new Date('2026-07-01T00:00:00Z'),
          title: 'Setup laptop',
          category: 'SETUP',
          status: 'DONE',
          priority: 'HIGH',
        },
        {
          ownerId: user.id,
          entryDate: new Date('2026-07-05T00:00:00Z'),
          title: 'Security training',
          category: 'TRAINING',
          status: 'IN_PROGRESS',
          priority: 'LOW',
        },
        {
          ownerId: user.id,
          entryDate: new Date('2026-07-09T00:00:00Z'),
          title: 'Team meeting',
          category: 'MEETING',
          status: 'BLOCKED',
          priority: 'MEDIUM',
        },
      ],
    });

    const all = await agent.get(`${basePath}/tasks`).set(...bearer(token));
    expect(all.body.data.map((task: { title: string }) => task.title)).toEqual([
      'Team meeting',
      'Security training',
      'Setup laptop',
    ]);
    expect(all.body.meta.total).toBe(3);

    const range = await agent
      .get(`${basePath}/tasks?from=2026-07-05&to=2026-07-09`)
      .set(...bearer(token));
    expect(range.body.meta.total).toBe(2);

    const byCategory = await agent
      .get(`${basePath}/tasks?category=SETUP,TRAINING`)
      .set(...bearer(token));
    expect(byCategory.body.meta.total).toBe(2);

    const byStatus = await agent.get(`${basePath}/tasks?status=DONE`).set(...bearer(token));
    expect(byStatus.body.meta.total).toBe(1);

    const byPriority = await agent.get(`${basePath}/tasks?priority=HIGH`).set(...bearer(token));
    expect(byPriority.body.meta.total).toBe(1);

    const combined = await agent
      .get(`${basePath}/tasks?status=DONE&priority=LOW`)
      .set(...bearer(token));
    expect(combined.body.meta.total).toBe(0);

    const page2 = await agent.get(`${basePath}/tasks?pageSize=2&page=2`).set(...bearer(token));
    expect(page2.body.meta).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(page2.body.data.map((task: { title: string }) => task.title)).toEqual(['Setup laptop']);
  });

  it("refuses another owner's list", async () => {
    const { token } = await authenticatedAs(testApp);
    const other = await createUser();
    const response = await agent.get(`${basePath}/tasks?ownerId=${other.id}`).set(...bearer(token));
    expect(response.status).toBe(403);
  });
});

describe('PATCH and DELETE /tasks/:id', () => {
  it("updates and deletes the caller's own task", async () => {
    const { user, token } = await authenticatedAs(testApp);
    const task = await createTask(user.id);

    const updated = await agent
      .patch(`${basePath}/tasks/${task.id}`)
      .set(...bearer(token))
      .send({ status: 'DONE', description: 'Finished with IT' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ status: 'DONE', description: 'Finished with IT' });

    const deleted = await agent.delete(`${basePath}/tasks/${task.id}`).set(...bearer(token));
    expect(deleted.status).toBe(204);
    expect(await db.taskEntry.count()).toBe(0);
  });

  it('refuses a non-owner write but allows an admin', async () => {
    const owner = await createUser();
    const task = await createTask(owner.id);

    const manager = await authenticatedAs(testApp, 'MANAGER');
    await db.user.update({ where: { id: owner.id }, data: { managerId: manager.user.id } });
    const managerWrite = await agent
      .patch(`${basePath}/tasks/${task.id}`)
      .set(...bearer(manager.token))
      .send({ status: 'DONE' });
    expect(managerWrite.status).toBe(403);

    const admin = await authenticatedAs(testApp, 'ADMIN');
    const adminWrite = await agent
      .patch(`${basePath}/tasks/${task.id}`)
      .set(...bearer(admin.token))
      .send({ status: 'DONE' });
    expect(adminWrite.status).toBe(200);
  });

  it('reports an unknown task as not found', async () => {
    const { token } = await authenticatedAs(testApp);
    const response = await agent
      .get(`${basePath}/tasks/00000000-0000-4000-8000-000000000000`)
      .set(...bearer(token));
    expect(response.status).toBe(404);
  });
});
