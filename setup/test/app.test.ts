import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createSetupApp } from '../src/app.js';
import { defaultDeps, type RunDeps } from '../src/service.js';

function testDeps(): RunDeps {
  const envPath = join(mkdtempSync(join(tmpdir(), 'setup-app-env-')), '.env');
  return { ...defaultDeps, envPath, generateSecret: () => 'generated-test-secret' };
}

function tmpSqliteUrl(): string {
  return `file:${join(mkdtempSync(join(tmpdir(), 'setup-app-')), 'prod.db')}`;
}

afterEach(() => {
  delete process.env.DB_STRING;
});

describe('setup tool HTTP surface', () => {
  it('reports health', async () => {
    const res = await request(createSetupApp(testDeps())).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('provisions from a demo environment', async () => {
    const res = await request(createSetupApp(testDeps()))
      .post('/provision')
      .send({
        dbString: tmpSqliteUrl(),
        adminEmail: 'admin@acme.example',
        adminName: 'Admin',
        adminPassword: 'Sup3rSecret!',
      });
    expect(res.status).toBe(200);
    expect(res.body.adminCreated).toBe(true);
    expect(res.body.restartRequired).toBe(true);
  });

  it('refuses to provision when DB_STRING is set (already production)', async () => {
    process.env.DB_STRING = 'postgresql://u:p@h:5432/db';
    const res = await request(createSetupApp(testDeps()))
      .post('/provision')
      .send({
        dbString: tmpSqliteUrl(),
        adminEmail: 'admin@acme.example',
        adminName: 'Admin',
        adminPassword: 'Sup3rSecret!',
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/demo mode/i);
  });

  it('rejects an invalid request body', async () => {
    const res = await request(createSetupApp(testDeps()))
      .post('/provision')
      .send({ dbString: '', adminEmail: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
