import type { Role } from '@onboarding-diary/shared';
import type { Express } from 'express';
import supertest, { type Agent } from 'supertest';

import { API_BASE_PATH, createApp } from '../../src/app.js';
import { loadConfig, type AppConfig } from '../../src/config.js';
import { signAccessToken } from '../../src/lib/accessToken.js';
import type { User } from '../../src/generated/prisma/client.js';
import { getTestDb, testDatabaseUrl } from './database.js';
import { createUser } from './factories.js';

export const TEST_JWT_SECRET = 'test-secret-that-is-long-enough-32';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    ...loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: TEST_JWT_SECRET,
      WEB_ORIGIN: 'http://localhost:5173',
    }),
    ...overrides,
  };
}

export type TestApp = {
  app: Express;
  agent: Agent;
  config: AppConfig;
  basePath: string;
};

export function buildTestApp(
  options: { config?: Partial<AppConfig>; rateLimitsEnabled?: boolean } = {},
): TestApp {
  const config = testConfig(options.config);
  const app = createApp({
    db: getTestDb(),
    config,
    ...(options.rateLimitsEnabled === undefined
      ? {}
      : { rateLimitsEnabled: options.rateLimitsEnabled }),
  });
  return { app, agent: supertest(app), config, basePath: API_BASE_PATH };
}

/** An agent whose requests carry a valid access token for a freshly created user. */
export async function authenticatedAs(
  testApp: TestApp,
  role: Role = 'RECRUIT',
  overrides: Parameters<typeof createUser>[0] = {},
): Promise<{ user: User; token: string; get: Agent['get'] }> {
  const user = await createUser({ ...overrides, role });
  const { accessToken } = signAccessToken(testApp.config, { sub: user.id, role: user.role });
  return { user, token: accessToken, get: testApp.agent.get.bind(testApp.agent) };
}

export function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

export { getTestDb };
