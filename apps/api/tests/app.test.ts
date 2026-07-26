import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';

import { createApp } from '../src/app.js';
import { authenticatedAs, bearer, buildTestApp, testConfig } from './helpers/app.js';
import type { Db } from '../src/lib/prisma.js';
import { disconnectTestDb, resetDatabase } from './helpers/database.js';

const testApp = buildTestApp();

type StubDb = Db;

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('app wiring', () => {
  it('serves requests in-process without opening a port', async () => {
    const response = await testApp.agent.get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('sets security headers and hides the framework', async () => {
    const response = await testApp.agent.get('/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured web origin with credentials', async () => {
    const response = await testApp.agent.get('/health').set('Origin', testApp.config.WEB_ORIGIN);
    expect(response.headers['access-control-allow-origin']).toBe(testApp.config.WEB_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('returns a 404 envelope for unknown routes', async () => {
    const response = await testApp.agent.get('/api/v1/nope');
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(response.body.error.requestId).toEqual(expect.any(String));
  });

  it('generates a requestId per request and echoes it', async () => {
    const first = await testApp.agent.get('/api/v1/nope');
    const second = await testApp.agent.get('/api/v1/nope');
    expect(first.headers['x-request-id']).toBeDefined();
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
    expect(first.body.error.requestId).toBe(first.headers['x-request-id']);
  });

  it('honours an inbound x-request-id', async () => {
    const response = await testApp.agent.get('/api/v1/nope').set('x-request-id', 'trace-me');
    expect(response.body.error.requestId).toBe('trace-me');
  });

  it('rejects malformed JSON with a 400 envelope', async () => {
    const response = await testApp.agent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects a body over the 256 KB limit', async () => {
    const response = await testApp.agent
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.com', password: 'x'.repeat(300 * 1024) }));
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns a generic 500 that leaks nothing about an unexpected failure', async () => {
    const { token } = await authenticatedAs(testApp);
    const failing = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('database is on fire')),
      user: { findUnique: vi.fn().mockRejectedValue(new Error('boom')) },
    } as unknown as StubDb;
    const app = createApp({ db: failing, config: testConfig() });

    const response = await supertest(app)
      .get('/api/v1/auth/me')
      .set(...bearer(token));
    expect(response.status).toBe(500);
    expect(response.body.error).toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(JSON.stringify(response.body)).not.toContain('boom');
  });
});

describe('health endpoint', () => {
  it('returns 503 when the database is unreachable', async () => {
    const failing = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('down')),
    } as unknown as StubDb;
    const response = await supertest(createApp({ db: failing, config: testConfig() })).get(
      '/health',
    );
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'degraded', database: 'down' });
  });
});
