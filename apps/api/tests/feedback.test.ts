import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { authenticatedAs, bearer, buildTestApp } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createFeedback, createUser } from './helpers/factories.js';

const testApp = buildTestApp();
const { agent, basePath } = testApp;
const db = getTestDb();
const today = new Date().toISOString().slice(0, 10);

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('feedback CRUD', () => {
  it('creates, reads, updates, and deletes a note', async () => {
    const { user, token } = await authenticatedAs(testApp);

    const created = await agent
      .post(`${basePath}/feedback`)
      .set(...bearer(token))
      .send({ entryDate: today, subject: 'Buddy system', type: 'POSITIVE' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ ownerId: user.id, type: 'POSITIVE' });

    const id = created.body.data.id;
    const read = await agent.get(`${basePath}/feedback/${id}`).set(...bearer(token));
    expect(read.status).toBe(200);

    const updated = await agent
      .patch(`${basePath}/feedback/${id}`)
      .set(...bearer(token))
      .send({ type: 'SUGGESTION', details: 'Pair recruits sooner' });
    expect(updated.body.data).toMatchObject({
      type: 'SUGGESTION',
      details: 'Pair recruits sooner',
    });

    const deleted = await agent.delete(`${basePath}/feedback/${id}`).set(...bearer(token));
    expect(deleted.status).toBe(204);
    expect(await db.feedbackNote.count()).toBe(0);
  });

  it('rejects a missing type', async () => {
    const { token } = await authenticatedAs(testApp);
    const response = await agent
      .post(`${basePath}/feedback`)
      .set(...bearer(token))
      .send({ entryDate: today, subject: 'Buddy system' });
    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('type');
  });

  it("refuses another recruit's note", async () => {
    const { token } = await authenticatedAs(testApp);
    const other = await createUser();
    const note = await createFeedback(other.id);
    const response = await agent.get(`${basePath}/feedback/${note.id}`).set(...bearer(token));
    expect(response.status).toBe(403);
  });

  it('filters a list by type and date', async () => {
    const { user, token } = await authenticatedAs(testApp);
    await createFeedback(user.id, { type: 'POSITIVE', daysAgo: 4 });
    await createFeedback(user.id, { type: 'CONCERN', daysAgo: 2 });
    await createFeedback(user.id, { type: 'CONCERN', daysAgo: 0 });

    const concerns = await agent.get(`${basePath}/feedback?type=CONCERN`).set(...bearer(token));
    expect(concerns.body.meta.total).toBe(2);

    const from = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const recent = await agent.get(`${basePath}/feedback?from=${from}`).set(...bearer(token));
    expect(recent.body.meta.total).toBe(1);
  });
});
