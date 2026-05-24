import { vi } from 'vitest';

// Mock config to avoid requiring real env vars in tests
vi.mock('../config/index.js', () => ({
  config: {
    NODE_ENV: 'test',
    PORT: 3000,
    API_PREFIX: '/api/v1',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_ACCESS_SECRET: 'test-access-secret-that-is-at-least-32-chars-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-at-least-32-chars-long',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    CORS_ORIGIN: 'http://localhost:5173',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX: 1000,
    BCRYPT_ROUNDS: 4,
    LOG_LEVEL: 'error',
  },
}));
