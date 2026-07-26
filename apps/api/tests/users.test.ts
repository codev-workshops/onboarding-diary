import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { authenticatedAs, bearer, buildTestApp } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createIssue, createTask, createUser } from './helpers/factories.js';

const testApp = buildTestApp();
const { agent, basePath } = testApp;
const db = getTestDb();

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('GET/PATCH /users/me', () => {
  it('returns and updates the caller profile', async () => {
    const { user, token } = await authenticatedAs(testApp);

    const read = await agent.get(`${basePath}/users/me`).set(...bearer(token));
    expect(read.status).toBe(200);
    expect(read.body.data.id).toBe(user.id);

    const updated = await agent
      .patch(`${basePath}/users/me`)
      .set(...bearer(token))
      .send({ fullName: '  Nadia Khan ', department: 'Engineering', startDate: '2026-07-01' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      fullName: 'Nadia Khan',
      department: 'Engineering',
      startDate: '2026-07-01',
    });
  });

  it('ignores privileged fields in a profile update', async () => {
    const { user, token } = await authenticatedAs(testApp);
    const response = await agent
      .patch(`${basePath}/users/me`)
      .set(...bearer(token))
      .send({ fullName: 'Same Person', role: 'ADMIN', email: 'promoted@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('RECRUIT');
    expect(response.body.data.email).toBe(user.email);
  });
});

describe('GET /users', () => {
  it('is admin-only', async () => {
    const { token } = await authenticatedAs(testApp, 'MANAGER');
    const response = await agent.get(`${basePath}/users`).set(...bearer(token));
    expect(response.status).toBe(403);
  });

  it('filters, searches, and paginates', async () => {
    const { token } = await authenticatedAs(testApp, 'ADMIN', { fullName: 'Ada Admin' });
    await createUser({ fullName: 'Bo Recruit', department: 'Engineering' });
    await createUser({ fullName: 'Cy Recruit', department: 'Support', isActive: false });
    await createUser({ fullName: 'Di Manager', role: 'MANAGER', department: 'Engineering' });

    const byRole = await agent.get(`${basePath}/users?role=RECRUIT`).set(...bearer(token));
    expect(byRole.body.data.map((user: { fullName: string }) => user.fullName)).toEqual([
      'Bo Recruit',
      'Cy Recruit',
    ]);

    const byDepartment = await agent
      .get(`${basePath}/users?department=engineering`)
      .set(...bearer(token));
    expect(byDepartment.body.meta.total).toBe(2);

    const inactive = await agent.get(`${basePath}/users?isActive=false`).set(...bearer(token));
    expect(inactive.body.data).toHaveLength(1);
    expect(inactive.body.data[0].fullName).toBe('Cy Recruit');

    const search = await agent.get(`${basePath}/users?q=recruit`).set(...bearer(token));
    expect(search.body.meta.total).toBe(2);

    const combined = await agent
      .get(`${basePath}/users?role=RECRUIT&department=Engineering`)
      .set(...bearer(token));
    expect(combined.body.meta.total).toBe(1);

    const page2 = await agent.get(`${basePath}/users?pageSize=2&page=2`).set(...bearer(token));
    expect(page2.body.meta).toMatchObject({ page: 2, pageSize: 2, total: 4 });
    expect(page2.body.data).toHaveLength(2);
  });
});

describe('GET /users/:id', () => {
  it('allows self, the manager, and an admin but nobody else', async () => {
    const manager = await createUser({ role: 'MANAGER' });
    const report = await createUser({ managerId: manager.id });

    const asReport = await authenticatedAs(testApp, 'RECRUIT');
    const asAdmin = await authenticatedAs(testApp, 'ADMIN');
    const { token: managerToken } = await authenticatedAs(testApp, 'MANAGER', {
      email: 'other.manager@example.com',
    });

    const self = await agent
      .get(`${basePath}/users/${asReport.user.id}`)
      .set(...bearer(asReport.token));
    expect(self.status).toBe(200);

    const admin = await agent.get(`${basePath}/users/${report.id}`).set(...bearer(asAdmin.token));
    expect(admin.status).toBe(200);

    const stranger = await agent.get(`${basePath}/users/${report.id}`).set(...bearer(managerToken));
    expect(stranger.status).toBe(403);
  });
});

describe('PATCH /users/:id', () => {
  it('changes a role and deactivates an account', async () => {
    const { token } = await authenticatedAs(testApp, 'ADMIN');
    const target = await createUser();

    const promoted = await agent
      .patch(`${basePath}/users/${target.id}`)
      .set(...bearer(token))
      .send({ role: 'MANAGER' });
    expect(promoted.body.data.role).toBe('MANAGER');

    const deactivated = await agent
      .patch(`${basePath}/users/${target.id}`)
      .set(...bearer(token))
      .send({ isActive: false });
    expect(deactivated.body.data.isActive).toBe(false);
  });

  it('protects the acting admin from self-demotion and self-deactivation', async () => {
    const { user, token } = await authenticatedAs(testApp, 'ADMIN');

    const demote = await agent
      .patch(`${basePath}/users/${user.id}`)
      .set(...bearer(token))
      .send({ role: 'RECRUIT' });
    expect(demote.status).toBe(422);
    expect(demote.body.error.details[0].field).toBe('role');

    const deactivate = await agent
      .patch(`${basePath}/users/${user.id}`)
      .set(...bearer(token))
      .send({ isActive: false });
    expect(deactivate.status).toBe(422);
    expect(deactivate.body.error.details[0].field).toBe('isActive');
  });

  it('is admin-only', async () => {
    const { token } = await authenticatedAs(testApp, 'MANAGER');
    const target = await createUser();
    const response = await agent
      .patch(`${basePath}/users/${target.id}`)
      .set(...bearer(token))
      .send({ role: 'ADMIN' });
    expect(response.status).toBe(403);
  });

  it('assigns and clears a manager but rejects self-assignment and cycles', async () => {
    const { token } = await authenticatedAs(testApp, 'ADMIN');
    const manager = await createUser({ role: 'MANAGER' });
    const report = await createUser();

    const assigned = await agent
      .patch(`${basePath}/users/${report.id}`)
      .set(...bearer(token))
      .send({ managerId: manager.id });
    expect(assigned.body.data.managerId).toBe(manager.id);

    const self = await agent
      .patch(`${basePath}/users/${report.id}`)
      .set(...bearer(token))
      .send({ managerId: report.id });
    expect(self.status).toBe(422);

    const cycle = await agent
      .patch(`${basePath}/users/${manager.id}`)
      .set(...bearer(token))
      .send({ managerId: report.id });
    expect(cycle.status).toBe(409);
    expect(cycle.body.error.code).toBe('CONFLICT');

    const cleared = await agent
      .patch(`${basePath}/users/${report.id}`)
      .set(...bearer(token))
      .send({ managerId: null });
    expect(cleared.body.data.managerId).toBeNull();
  });

  it('revokes refresh tokens when an account is deactivated', async () => {
    const { token } = await authenticatedAs(testApp, 'ADMIN');
    const target = await createUser();
    await db.refreshToken.create({
      data: {
        userId: target.id,
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await agent
      .patch(`${basePath}/users/${target.id}`)
      .set(...bearer(token))
      .send({ isActive: false });

    const live = await db.refreshToken.count({ where: { userId: target.id, revokedAt: null } });
    expect(live).toBe(0);
  });
});

describe('GET /users/me/direct-reports', () => {
  it("summarises only the caller's own reports", async () => {
    const first = await authenticatedAs(testApp, 'MANAGER');
    const second = await authenticatedAs(testApp, 'MANAGER', {
      email: 'second.manager@example.com',
    });

    const mine = await createUser({ fullName: 'Bo Recruit', managerId: first.user.id });
    await createUser({ fullName: 'Cy Recruit', managerId: second.user.id });

    await createTask(mine.id, { title: 'Done task', daysAgo: 3 });
    await createTask(mine.id, { title: 'Open task', daysAgo: 1 });
    await db.taskEntry.updateMany({ where: { title: 'Done task' }, data: { status: 'DONE' } });
    await createIssue(mine.id, { daysAgo: 0 });

    const response = await agent
      .get(`${basePath}/users/me/direct-reports`)
      .set(...bearer(first.token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      taskProgress: { completed: 1, total: 2, completionPercent: 50 },
      openIssueCount: 1,
    });
    expect(response.body.data[0].user.fullName).toBe('Bo Recruit');
    expect(response.body.data[0].lastActivityDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it('is closed to recruits', async () => {
    const { token } = await authenticatedAs(testApp);
    const response = await agent.get(`${basePath}/users/me/direct-reports`).set(...bearer(token));
    expect(response.status).toBe(403);
  });
});
