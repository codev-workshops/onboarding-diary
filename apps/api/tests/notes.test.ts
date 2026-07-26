import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { authenticatedAs, bearer, buildTestApp } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createNote } from './helpers/factories.js';

const testApp = buildTestApp();
const { agent, basePath } = testApp;
const db = getTestDb();
const today = new Date().toISOString().slice(0, 10);

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('notes CRUD', () => {
  it('normalises tags on create without duplicating Tag rows', async () => {
    const { token } = await authenticatedAs(testApp);

    const first = await agent
      .post(`${basePath}/notes`)
      .set(...bearer(token))
      .send({ entryDate: today, title: 'Day 1', tags: ['Setup', 'setup ', ' VPN'] });
    expect(first.status).toBe(201);
    expect(first.body.data.tags).toEqual(['setup', 'vpn']);

    await agent
      .post(`${basePath}/notes`)
      .set(...bearer(token))
      .send({ entryDate: today, title: 'Day 2', tags: ['SETUP'] });

    expect(await db.tag.count()).toBe(2);
  });

  it('replaces tags on update and removes join rows on delete', async () => {
    const { token } = await authenticatedAs(testApp);
    const created = await agent
      .post(`${basePath}/notes`)
      .set(...bearer(token))
      .send({ entryDate: today, title: 'Day 1', tags: ['setup', 'vpn'] });
    const id = created.body.data.id;

    const updated = await agent
      .patch(`${basePath}/notes/${id}`)
      .set(...bearer(token))
      .send({ tags: ['mentoring'] });
    expect(updated.body.data.tags).toEqual(['mentoring']);
    expect(await db.noteTag.count()).toBe(1);

    const deleted = await agent.delete(`${basePath}/notes/${id}`).set(...bearer(token));
    expect(deleted.status).toBe(204);
    expect(await db.noteTag.count()).toBe(0);
    // Tags outlive the notes that introduced them.
    expect(await db.tag.count()).toBe(3);
  });

  it('filters by one tag and by two tags together', async () => {
    const { user, token } = await authenticatedAs(testApp);
    await createNote(user.id, { title: 'Both', tags: ['setup', 'vpn'], daysAgo: 2 });
    await createNote(user.id, { title: 'Setup only', tags: ['setup'], daysAgo: 1 });
    await createNote(user.id, { title: 'Untagged' });

    const bySetup = await agent.get(`${basePath}/notes?tag=setup`).set(...bearer(token));
    expect(bySetup.body.meta.total).toBe(2);

    const byBoth = await agent.get(`${basePath}/notes?tag=setup&tag=vpn`).set(...bearer(token));
    expect(byBoth.body.meta.total).toBe(1);
    expect(byBoth.body.data[0].title).toBe('Both');

    const all = await agent.get(`${basePath}/notes`).set(...bearer(token));
    expect(all.body.data.map((note: { title: string }) => note.title)).toEqual([
      'Untagged',
      'Setup only',
      'Both',
    ]);
  });
});
