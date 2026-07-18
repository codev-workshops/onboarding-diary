import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';

// Bind an isolated SQLite DB via DB_STRING before importing the app, so the app's
// config singleton runs in production mode (DB_STRING present ⇒ demo off), while
// still using SQLite for a fast, Docker-free test (docs/ASSUMPTIONS.md §13, §16).
const dir = mkdtempSync(join(tmpdir(), 'onboarding-demooff-'));
const url = `file:${join(dir, 'demooff.db')}`;
process.env.DB_STRING = url;
process.env.JWT_SECRET = 'test-secret-production-grade-value';
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

beforeAll(() => {
  app = createApp();
  db = prisma;
});

afterAll(async () => {
  await db.$disconnect();
  // Avoid leaking production mode into demo-mode tests in the same worker.
  delete process.env.DB_STRING;
});

describe('demo credentials are unavailable when demo mode is off', () => {
  it('reports onboarding enablers disabled', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.onboardingEnablersEnabled).toBe(false);
  });

  it('returns 404 with no account list or password from /api/config/demo', async () => {
    const res = await request(app).get('/api/config/demo');
    expect(res.status).toBe(404);
    expect(res.body.password).toBeUndefined();
    expect(res.body.accounts).toBeUndefined();
  });

  it('reports the production datasource', async () => {
    const res = await request(app).get('/api/config');
    expect(res.body.datasource).toBe('production');
    expect(res.body.demoMode).toBe(false);
  });

  it('refuses to authenticate a @demo.local account even if one exists', async () => {
    // Defense in depth: demo accounts share a public password (SECURITY_REVIEW.md).
    const passwordHash = await hashPassword('Passw0rd!');
    await db.user.create({
      data: {
        email: 'admin@demo.local',
        passwordHash,
        name: 'Ada Admin',
        role: 'Admin',
        startDate: new Date(),
        timezone: 'Asia/Kolkata',
      },
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.local', password: 'Passw0rd!' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});
