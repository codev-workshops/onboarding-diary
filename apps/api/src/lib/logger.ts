import { pino, type Logger } from 'pino';

import type { AppConfig } from '../config.js';

/** Keys that must never appear in a log line (TRD 5.4). */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.accessToken',
  '*.refreshToken',
];

export function createLogger(config: Pick<AppConfig, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
    redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    base: {},
  });
}

export type { Logger };
