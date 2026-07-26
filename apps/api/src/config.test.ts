import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from './config.js';

const VALID = {
  DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
  JWT_SECRET: 'a'.repeat(32),
};

describe('loadConfig', () => {
  it('applies the documented defaults', () => {
    const config = loadConfig(VALID);
    expect(config).toMatchObject({
      NODE_ENV: 'development',
      ACCESS_TOKEN_TTL: '15m',
      REFRESH_TOKEN_TTL_DAYS: 14,
      PORT: 4000,
      LOG_LEVEL: 'info',
      WEB_ORIGIN: 'http://localhost:5173',
    });
  });

  it('coerces numeric variables', () => {
    const config = loadConfig({ ...VALID, PORT: '8080', REFRESH_TOKEN_TTL_DAYS: '7' });
    expect(config.PORT).toBe(8080);
    expect(config.REFRESH_TOKEN_TTL_DAYS).toBe(7);
  });

  it.each([
    [{ JWT_SECRET: 'a'.repeat(32) }, 'DATABASE_URL is required'],
    [
      { ...VALID, DATABASE_URL: 'mysql://localhost/db' },
      'DATABASE_URL must be a PostgreSQL connection string',
    ],
    [{ DATABASE_URL: VALID.DATABASE_URL }, 'JWT_SECRET is required'],
    [{ ...VALID, JWT_SECRET: 'too-short' }, 'JWT_SECRET must be at least 32 characters'],
    [
      { ...VALID, ACCESS_TOKEN_TTL: 'fifteen minutes' },
      'ACCESS_TOKEN_TTL must look like 15m, 30s, or 1h',
    ],
    [{ ...VALID, REFRESH_TOKEN_TTL_DAYS: '-1' }, 'REFRESH_TOKEN_TTL_DAYS must be positive'],
    [{ ...VALID, WEB_ORIGIN: 'not-a-url' }, 'WEB_ORIGIN must be an absolute URL'],
  ])('rejects invalid configuration with a clear message (%#)', (env, expected) => {
    let thrown: unknown;
    try {
      loadConfig(env);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ConfigError);
    expect((thrown as ConfigError).message).toContain(expected);
  });

  it('reports every problem at once', () => {
    try {
      loadConfig({});
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as ConfigError).issues).toHaveLength(2);
    }
  });
});
