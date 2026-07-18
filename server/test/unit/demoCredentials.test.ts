import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../../src/config/env.js';
import { DEMO_PASSWORD, getDemoCredentials } from '../../src/domain/demo.js';

function makeConfig(overrides: Partial<AppConfig>): AppConfig {
  return {
    demoMode: true,
    dbString: undefined,
    demoDatabaseUrl: 'file:./test.db',
    jwtSecret: 'test',
    jwtExpiresIn: '8h',
    port: 4000,
    corsOrigin: 'http://localhost:5173',
    ...overrides,
  };
}

describe('getDemoCredentials', () => {
  it('returns the static demo accounts and password when demo mode is on', () => {
    const creds = getDemoCredentials(makeConfig({ demoMode: true }));
    expect(creds).not.toBeNull();
    expect(creds?.password).toBe(DEMO_PASSWORD);
    expect(creds?.accounts.length).toBeGreaterThan(0);
    // Only ever exposes the well-known demo accounts, never arbitrary users.
    for (const account of creds?.accounts ?? []) {
      expect(account.email.endsWith('@demo.local')).toBe(true);
    }
  });

  it('returns null in production mode (when a DB string is configured)', () => {
    expect(getDemoCredentials(makeConfig({ demoMode: false }))).toBeNull();
    expect(
      getDemoCredentials(makeConfig({ demoMode: false, dbString: 'postgres://x' })),
    ).toBeNull();
  });
});
