import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';

// Bind an isolated SQLite DB and force demo mode OFF before importing the app, so
// the app's config singleton reads DEMO_MODE=false (docs/ASSUMPTIONS.md §16).
const dir = mkdtempSync(join(tmpdir(), 'onboarding-demooff-'));
const url = `file:${join(dir, 'demooff.db')}`;
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = 'test-secret';
process.env.DEMO_MODE = 'false';
execSync('npx prisma db push --skip-generate --accept-data-loss', {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: url },
  stdio: 'ignore',
});

const { createApp } = await import('../../src/app.js');
const { prisma } = await import('../../src/db/prisma.js');

let app: Express;
let db: PrismaClient;

beforeAll(() => {
  app = createApp();
  db = prisma;
});

afterAll(async () => {
  await db.$disconnect();
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
});
