/** Startup configuration, validated once so the process fails fast (TRD 9). */

import { z } from 'zod';

const durationPattern = /^\d+(ms|s|m|h|d)$/;

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required' })
    .min(1, 'DATABASE_URL is required')
    .startsWith('postgres', 'DATABASE_URL must be a PostgreSQL connection string'),
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET is required' })
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z
    .string()
    .regex(durationPattern, 'ACCESS_TOKEN_TTL must look like 15m, 30s, or 1h')
    .default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce
    .number()
    .int('REFRESH_TOKEN_TTL_DAYS must be a whole number of days')
    .positive('REFRESH_TOKEN_TTL_DAYS must be positive')
    .default(14),
  WEB_ORIGIN: z.string().url('WEB_ORIGIN must be an absolute URL').default('http://localhost:5173'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type AppConfig = z.infer<typeof configSchema>;

export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

/** Parse and validate the environment, throwing a `ConfigError` listing every problem. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = configSchema.safeParse(env);
  if (result.success) return result.data;
  throw new ConfigError(
    result.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`),
  );
}
