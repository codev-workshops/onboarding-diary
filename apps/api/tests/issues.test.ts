import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { authenticatedAs, bearer, buildTestApp } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createIssue, createUser } from './helpers/factories.js';

const testApp = buildTestApp();
const { agent, basePath } = testApp;
const db = getTestDb();
const today = new Date().toISOString().slice(0, 10);

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('POST /issues', () => {
  it('applies the OPEN and MEDIUM defaults', async () => {
    const { user, token } = await authenticatedAs(testApp);
    const response = await agent
      .post(`${basePath}/issues`)
      .set(...bearer(token))
      .send({ entryDate: today, title: 'VPN token expired' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      ownerId: user.id,
      severity: 'MEDIUM',
      status: 'OPEN',
      resolutionNotes: null,
    });
  });

  it('rejects an unknown severity', async () => {
    const { token } = await authenticatedAs(testApp);
    const response = await agent
      .post(`${basePath}/issues`)
      .set(...bearer(token))
      .send({ entryDate: today, title: 'Broken', severity: 'APOCALYPTIC' });
    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('severity');
  });
});

describe('GET /issues', () => {
  it('filters by severity and by multi-value status', async () => {
    const { user, token } = await authenticatedAs(testApp);
    await db.issueEntry.createMany({
      data: [
        {
          ownerId: user.id,
          entryDate: new Date('2026-07-01T00:00:00Z'),
          title: 'Laptop dead',
          severity: 'CRITICAL',
          status: 'OPEN',
        },
        {
          ownerId: user.id,
          entryDate: new Date('2026-07-02T00:00:00Z'),
          title: 'Slow VPN',
          severity: 'LOW',
          status: 'IN_PROGRESS',
        },
        {
          ownerId: user.id,
          entryDate: new Date('2026-07-03T00:00:00Z'),
          title: 'Badge missing',
          severity: 'MEDIUM',
          status: 'RESOLVED',
        },
      ],
    });

    const critical = await agent.get(`${basePath}/issues?severity=CRITICAL`).set(...bearer(token));
    expect(critical.body.meta.total).toBe(1);

    const open = await agent
      .get(`${basePath}/issues?status=OPEN,IN_PROGRESS`)
      .set(...bearer(token));
    expect(open.body.meta.total).toBe(2);
    expect(open.body.data.map((issue: { title: string }) => issue.title)).toEqual([
      'Slow VPN',
      'Laptop dead',
    ]);

    const ranged = await agent.get(`${basePath}/issues?from=2026-07-03`).set(...bearer(token));
    expect(ranged.body.meta.total).toBe(1);
  });
});

describe('PATCH /issues/:id', () => {
  it('resolves an issue with notes', async () => {
    const { user, token } = await authenticatedAs(testApp);
    const issue = await createIssue(user.id);

    const response = await agent
      .patch(`${basePath}/issues/${issue.id}`)
      .set(...bearer(token))
      .send({ status: 'RESOLVED', resolutionNotes: 'IT reissued the token' });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: 'RESOLVED',
      resolutionNotes: 'IT reissued the token',
    });
  });

  it('refuses a non-owner write', async () => {
    const { token } = await authenticatedAs(testApp);
    const other = await createUser();
    const issue = await createIssue(other.id);

    const response = await agent
      .patch(`${basePath}/issues/${issue.id}`)
      .set(...bearer(token))
      .send({ status: 'RESOLVED' });
    expect(response.status).toBe(403);
  });

  it('deletes an issue', async () => {
    const { user, token } = await authenticatedAs(testApp);
    const issue = await createIssue(user.id);
    const response = await agent.delete(`${basePath}/issues/${issue.id}`).set(...bearer(token));
    expect(response.status).toBe(204);
    expect(await db.issueEntry.count()).toBe(0);
  });
});
