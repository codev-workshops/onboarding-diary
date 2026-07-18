import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { afterEach, describe, expect, it } from 'vitest';
import { buildClient, type Db } from '../src/db.js';
import { provisionProduction } from '../src/provision.js';
import { defaultDeps, runProvision, type RunDeps } from '../src/service.js';
import { MODE_SETTING_KEY, PRODUCTION_MODE_VALUE } from '../../server/src/domain/mode.js';

function tmpSqliteUrl(): string {
  return `file:${join(mkdtempSync(join(tmpdir(), 'setup-prov-')), 'prod.db')}`;
}

function tmpEnvPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'setup-prov-env-')), '.env');
}

let client: Db | undefined;

afterEach(async () => {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
});

function testDeps(): RunDeps {
  return { ...defaultDeps, envPath: tmpEnvPath(), generateSecret: () => 'generated-test-secret' };
}

describe('runProvision (SQLite, no Docker)', () => {
  it('applies schema, seeds categories, creates the admin, sets the latch, writes env', async () => {
    const deps = testDeps();
    const dbString = tmpSqliteUrl();
    const result = await runProvision(
      { dbString, adminEmail: 'Real.Admin@Acme.example', adminName: 'Real Admin', adminPassword: 'Sup3rSecret!' },
      deps,
    );

    expect(result.categoriesCreated).toBe(5);
    expect(result.adminCreated).toBe(true);
    expect(result.adminEmail).toBe('real.admin@acme.example');
    expect(result.envWritten).toBe(true);
    expect(result.jwtSecret).toBe('generated-test-secret');
    expect(result.restartRequired).toBe(true);

    const env = readFileSync(deps.envPath, 'utf8');
    expect(env).toContain('JWT_SECRET=generated-test-secret');
    expect(env).toContain('DB_STRING=');

    client = buildClient(dbString);
    const admin = await client.user.findUnique({ where: { email: 'real.admin@acme.example' } });
    expect(admin?.role).toBe('Admin');
    expect(await bcrypt.compare('Sup3rSecret!', admin?.passwordHash ?? '')).toBe(true);
    const latch = await client.setting.findUnique({ where: { key: MODE_SETTING_KEY } });
    expect(latch?.value).toBe(PRODUCTION_MODE_VALUE);
    // No demo accounts are ever created by provisioning.
    const demo = await client.user.findFirst({ where: { email: { endsWith: '@demo.local' } } });
    expect(demo).toBeNull();
  });

  it('is idempotent — a second run creates nothing and never resets the admin', async () => {
    const deps = testDeps();
    const dbString = tmpSqliteUrl();
    const input = {
      dbString,
      adminEmail: 'admin@acme.example',
      adminName: 'Admin',
      adminPassword: 'FirstPassword1',
    };
    await runProvision(input, deps);
    const second = await runProvision({ ...input, adminPassword: 'DifferentPassword2' }, deps);
    expect(second.categoriesCreated).toBe(0);
    expect(second.adminCreated).toBe(false);

    client = buildClient(dbString);
    const admin = await client.user.findUnique({ where: { email: 'admin@acme.example' } });
    // Original password still valid; not overwritten by the second run.
    expect(await bcrypt.compare('FirstPassword1', admin?.passwordHash ?? '')).toBe(true);
  });
});

describe('provisionProduction validation', () => {
  it('rejects a demo (@demo.local) admin email', async () => {
    client = buildClient(tmpSqliteUrl());
    await expect(
      provisionProduction(client, {
        adminEmail: 'admin@demo.local',
        adminName: 'X',
        adminPassword: 'Sup3rSecret!',
      }),
    ).rejects.toThrow(/demo/i);
  });

  it('rejects a password below the policy minimum', async () => {
    // Schema not needed — validation happens before any DB write for the email/pw checks.
    const dbString = tmpSqliteUrl();
    await runProvision(
      { dbString, adminEmail: 'a@acme.example', adminName: 'A', adminPassword: 'ValidPass1' },
      testDeps(),
    ).catch(() => undefined);
    client = buildClient(dbString);
    await expect(
      provisionProduction(client, { adminEmail: 'b@acme.example', adminName: 'B', adminPassword: 'short' }),
    ).rejects.toThrow(/at least/i);
  });

  it('rejects an invalid timezone', async () => {
    client = buildClient(tmpSqliteUrl());
    await expect(
      provisionProduction(client, {
        adminEmail: 'a@acme.example',
        adminName: 'A',
        adminPassword: 'ValidPass1',
        timezone: 'Not/AZone',
      }),
    ).rejects.toThrow(/timezone/i);
  });
});
