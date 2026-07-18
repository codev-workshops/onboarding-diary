import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from '../../src/config/env.js';
import { assertJwtSecretStrong, assertProvisioned } from '../../src/config/guards.js';
import { MODE_SETTING_KEY, PRODUCTION_MODE_VALUE } from '../../src/domain/mode.js';
import { createTestDb } from '../helpers/db.js';

function cfg(overrides: Partial<AppConfig>): AppConfig {
  return {
    demoMode: false,
    dbString: 'postgres://x',
    demoDatabaseUrl: 'file:./dev.db',
    jwtSecret: 'a-strong-enough-secret-value',
    jwtExpiresIn: '8h',
    port: 4000,
    corsOrigin: 'http://localhost:5173',
    ...overrides,
  };
}

describe('assertJwtSecretStrong', () => {
  it('is a no-op in demo mode', () => {
    expect(() => assertJwtSecretStrong(cfg({ demoMode: true, jwtSecret: 'dev-only-change-me' }))).not.toThrow();
  });

  it('throws in production for the placeholder secret', () => {
    expect(() => assertJwtSecretStrong(cfg({ jwtSecret: 'dev-only-change-me' }))).toThrow(/JWT_SECRET/);
  });

  it('throws in production for a too-short secret', () => {
    expect(() => assertJwtSecretStrong(cfg({ jwtSecret: 'short' }))).toThrow(/JWT_SECRET/);
  });

  it('passes in production for a strong secret', () => {
    expect(() => assertJwtSecretStrong(cfg({}))).not.toThrow();
  });
});

describe('assertProvisioned', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    ({ prisma } = createTestDb());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('is a no-op in demo mode', async () => {
    await expect(assertProvisioned(prisma, cfg({ demoMode: true }))).resolves.toBeUndefined();
  });

  it('throws when the production DB is not provisioned (no latch/admin)', async () => {
    await expect(assertProvisioned(prisma, cfg({}))).rejects.toThrow(/not provisioned/);
  });

  it('resolves once the latch and an admin exist', async () => {
    await prisma.setting.create({ data: { key: MODE_SETTING_KEY, value: PRODUCTION_MODE_VALUE } });
    await prisma.user.create({
      data: {
        email: 'real.admin@acme.example',
        passwordHash: 'x',
        name: 'Real Admin',
        role: 'Admin',
        startDate: new Date(),
        timezone: 'Asia/Kolkata',
      },
    });
    await expect(assertProvisioned(prisma, cfg({}))).resolves.toBeUndefined();
  });
});
