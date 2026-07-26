import express, { type Express } from 'express';
import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { assertEntryAccess, type AccessMode, type Caller } from '../src/access/entryAccess.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { createLogger } from '../src/lib/logger.js';
import { requireAuth } from '../src/middleware/requireAuth.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { signAccessToken } from '../src/lib/accessToken.js';
import { requestId } from '../src/middleware/requestContext.js';
import { testConfig } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createUser } from './helpers/factories.js';

const config = testConfig();
const logger = createLogger(config);
const db = getTestDb();

/** A minimal app that exercises the middleware in isolation (T-047, T-048). */
function guardedApp(): Express {
  const app = express();
  app.use(requestId());
  app.use(requireAuth(config));
  app.get('/admins-only', requireRole('ADMIN'), (_req, res) => {
    res.json({ data: 'ok' });
  });
  app.get('/staff-only', requireRole('ADMIN', 'MANAGER'), (_req, res) => {
    res.json({ data: 'ok' });
  });
  app.get('/entries/:ownerId/:mode', async (req, res, next) => {
    try {
      const ownerId = await assertEntryAccess(
        db,
        req.user as Caller,
        req.params.ownerId,
        req.params.mode as AccessMode,
      );
      res.json({ data: { ownerId } });
    } catch (error) {
      next(error);
    }
  });
  app.use(errorHandler(logger));
  return app;
}

const app = guardedApp();

function tokenFor(user: { id: string; role: Caller['role'] }): string {
  return signAccessToken(config, { sub: user.id, role: user.role }).accessToken;
}

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('requireRole', () => {
  it.each([
    ['ADMIN', 200],
    ['MANAGER', 403],
    ['RECRUIT', 403],
  ] as const)('gives %s a %i on an admin-only route', async (role, status) => {
    const user = await createUser({ role });
    const response = await supertest(app)
      .get('/admins-only')
      .set('Authorization', `Bearer ${tokenFor(user)}`);
    expect(response.status).toBe(status);
    if (status === 403) expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it.each([
    ['ADMIN', 200],
    ['MANAGER', 200],
    ['RECRUIT', 403],
  ] as const)('gives %s a %i on a staff route', async (role, status) => {
    const user = await createUser({ role });
    const response = await supertest(app)
      .get('/staff-only')
      .set('Authorization', `Bearer ${tokenFor(user)}`);
    expect(response.status).toBe(status);
  });

  it('returns 401 when no token is presented', async () => {
    const response = await supertest(app).get('/admins-only');
    expect(response.status).toBe(401);
  });
});

describe('assertEntryAccess', () => {
  it('lets a recruit read and write their own entries', async () => {
    const recruit = await createUser();
    for (const mode of ['read', 'write'] as const) {
      const response = await supertest(app)
        .get(`/entries/${recruit.id}/${mode}`)
        .set('Authorization', `Bearer ${tokenFor(recruit)}`);
      expect(response.status).toBe(200);
      expect(response.body.data.ownerId).toBe(recruit.id);
    }
  });

  it('lets a manager read but not write a direct report', async () => {
    const manager = await createUser({ role: 'MANAGER' });
    const report = await createUser({ managerId: manager.id });
    const auth = `Bearer ${tokenFor(manager)}`;

    expect(
      (await supertest(app).get(`/entries/${report.id}/read`).set('Authorization', auth)).status,
    ).toBe(200);
    const write = await supertest(app)
      .get(`/entries/${report.id}/write`)
      .set('Authorization', auth);
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe('FORBIDDEN');
  });

  it('blocks a manager from a recruit who reports elsewhere', async () => {
    const manager = await createUser({ role: 'MANAGER' });
    const otherManager = await createUser({ role: 'MANAGER' });
    const report = await createUser({ managerId: otherManager.id });
    const response = await supertest(app)
      .get(`/entries/${report.id}/read`)
      .set('Authorization', `Bearer ${tokenFor(manager)}`);
    expect(response.status).toBe(403);
  });

  it('blocks a recruit from another recruit', async () => {
    const recruit = await createUser();
    const peer = await createUser();
    const response = await supertest(app)
      .get(`/entries/${peer.id}/read`)
      .set('Authorization', `Bearer ${tokenFor(recruit)}`);
    expect(response.status).toBe(403);
  });

  it('lets an admin read and write anyone', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const recruit = await createUser();
    for (const mode of ['read', 'write'] as const) {
      const response = await supertest(app)
        .get(`/entries/${recruit.id}/${mode}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);
      expect(response.status).toBe(200);
    }
  });

  it('reports an unknown owner as 403 so ids are not enumerable', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const response = await supertest(app)
      .get('/entries/6f1b0f7e-0000-4000-8000-000000000000/read')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(response.status).toBe(403);
  });
});
