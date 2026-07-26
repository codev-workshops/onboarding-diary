import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { authenticatedAs, bearer, buildTestApp } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { calendarDate, createFeedback, createNote, createUser } from './helpers/factories.js';

const testApp = buildTestApp();
const { agent, basePath } = testApp;
const db = getTestDb();

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

/** Ten tasks (four done), three issues (two open), plus one feedback note and one note. */
async function seedFixture(ownerId: string): Promise<void> {
  await db.taskEntry.createMany({
    data: [
      ...Array.from({ length: 4 }, (_unused, index) => ({
        ownerId,
        entryDate: calendarDate(10 - index),
        title: `Done ${index}`,
        status: 'DONE' as const,
      })),
      ...Array.from({ length: 3 }, (_unused, index) => ({
        ownerId,
        entryDate: calendarDate(6 - index),
        title: `In progress ${index}`,
        status: 'IN_PROGRESS' as const,
      })),
      ...Array.from({ length: 2 }, (_unused, index) => ({
        ownerId,
        entryDate: calendarDate(4 - index),
        title: `Not started ${index}`,
        status: 'NOT_STARTED' as const,
      })),
      { ownerId, entryDate: calendarDate(3), title: 'Blocked', status: 'BLOCKED' as const },
    ],
  });
  await db.issueEntry.createMany({
    data: [
      {
        ownerId,
        entryDate: calendarDate(2),
        title: 'Laptop dead',
        severity: 'CRITICAL',
        status: 'OPEN',
      },
      {
        ownerId,
        entryDate: calendarDate(2),
        title: 'Slow VPN',
        severity: 'MEDIUM',
        status: 'IN_PROGRESS',
      },
      {
        ownerId,
        entryDate: calendarDate(2),
        title: 'Badge missing',
        severity: 'HIGH',
        status: 'RESOLVED',
      },
    ],
  });
  await createFeedback(ownerId, { daysAgo: 1 });
  await createNote(ownerId, { daysAgo: 0, tags: ['setup'] });
}

describe('GET /dashboard', () => {
  it("summarises the caller's own diary", async () => {
    const { user, token } = await authenticatedAs(testApp);
    await seedFixture(user.id);

    const response = await agent.get(`${basePath}/dashboard`).set(...bearer(token));
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      ownerId: user.id,
      counts: { tasks: 10, issues: 3, feedback: 1, notes: 1 },
      taskProgress: {
        byStatus: { NOT_STARTED: 2, IN_PROGRESS: 3, BLOCKED: 1, DONE: 4 },
        completed: 4,
        total: 10,
        completionPercent: 40,
      },
      openIssues: { total: 2, bySeverity: { LOW: 0, MEDIUM: 1, HIGH: 0, CRITICAL: 1 } },
    });
  });

  it('returns the five newest entries labelled by kind', async () => {
    const { user, token } = await authenticatedAs(testApp);
    await db.taskEntry.create({
      data: { ownerId: user.id, entryDate: calendarDate(4), title: 'Task entry' },
    });
    await db.issueEntry.create({
      data: { ownerId: user.id, entryDate: calendarDate(3), title: 'Issue entry' },
    });
    await createFeedback(user.id, { subject: 'Feedback entry', daysAgo: 2 });
    await createNote(user.id, { title: 'Note entry', daysAgo: 1 });
    await db.taskEntry.create({
      data: { ownerId: user.id, entryDate: calendarDate(0), title: 'Newest task' },
    });
    await db.taskEntry.create({
      data: { ownerId: user.id, entryDate: calendarDate(9), title: 'Oldest task' },
    });

    const response = await agent.get(`${basePath}/dashboard`).set(...bearer(token));
    expect(
      response.body.data.recentActivity.map(
        (item: { kind: string; title: string }) => `${item.kind}:${item.title}`,
      ),
    ).toEqual([
      'TASK:Newest task',
      'NOTE:Note entry',
      'FEEDBACK:Feedback entry',
      'ISSUE:Issue entry',
      'TASK:Task entry',
    ]);
    expect(response.body.data.lastActivityDate).toBe(calendarDate(0).toISOString().slice(0, 10));
  });

  it('reports an empty diary without dividing by zero', async () => {
    const { token } = await authenticatedAs(testApp);
    const response = await agent.get(`${basePath}/dashboard`).set(...bearer(token));
    expect(response.body.data).toMatchObject({
      counts: { tasks: 0, issues: 0, feedback: 0, notes: 0 },
      taskProgress: { completionPercent: 0 },
      recentActivity: [],
      lastActivityDate: null,
    });
  });

  it('scopes another ownerId to an authorised relationship', async () => {
    const manager = await authenticatedAs(testApp, 'MANAGER');
    const report = await createUser({ managerId: manager.user.id });
    const stranger = await createUser();
    const recruit = await authenticatedAs(testApp);
    const admin = await authenticatedAs(testApp, 'ADMIN');

    const forReport = await agent
      .get(`${basePath}/dashboard?ownerId=${report.id}`)
      .set(...bearer(manager.token));
    expect(forReport.status).toBe(200);
    expect(forReport.body.data.ownerId).toBe(report.id);

    const forStranger = await agent
      .get(`${basePath}/dashboard?ownerId=${stranger.id}`)
      .set(...bearer(manager.token));
    expect(forStranger.status).toBe(403);

    const recruitForOther = await agent
      .get(`${basePath}/dashboard?ownerId=${report.id}`)
      .set(...bearer(recruit.token));
    expect(recruitForOther.status).toBe(403);

    const adminForAnyone = await agent
      .get(`${basePath}/dashboard?ownerId=${stranger.id}`)
      .set(...bearer(admin.token));
    expect(adminForAnyone.status).toBe(200);
  });
});

describe('GET /dashboard/admin', () => {
  it('reports organisation-wide totals for an admin', async () => {
    const admin = await authenticatedAs(testApp, 'ADMIN');
    const recruit = await createUser();
    await createUser({ role: 'MANAGER' });
    await createUser({ isActive: false });
    await seedFixture(recruit.id);

    const response = await agent.get(`${basePath}/dashboard/admin`).set(...bearer(admin.token));
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      users: {
        total: 4,
        active: 3,
        inactive: 1,
        byRole: { RECRUIT: 2, MANAGER: 1, ADMIN: 1 },
      },
      counts: { tasks: 10, issues: 3, feedback: 1, notes: 1 },
      taskProgress: { completed: 4, total: 10, completionPercent: 40 },
      openIssues: { total: 2 },
    });
  });

  it('is closed to non-admins', async () => {
    const { token } = await authenticatedAs(testApp, 'MANAGER');
    const response = await agent.get(`${basePath}/dashboard/admin`).set(...bearer(token));
    expect(response.status).toBe(403);
  });
});
