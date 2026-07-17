import { config as loadEnv } from 'dotenv';

loadEnv();

/** Whether the app is running in demo mode (see docs/ASSUMPTIONS.md §13). */
function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

export interface AppConfig {
  demoMode: boolean;
  databaseUrl: string;
  databaseUrlPostgres: string | undefined;
  jwtSecret: string;
  jwtExpiresIn: string;
  port: number;
  corsOrigin: string;
}

export const config: AppConfig = {
  demoMode: parseBool(process.env.DEMO_MODE, true),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  databaseUrlPostgres: process.env.DATABASE_URL_POSTGRES || undefined,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};

/**
 * Resolves whether onboarding enablers should be active. Enablers are on only in
 * demo mode (docs/ASSUMPTIONS.md §2, §13).
 */
export function onboardingEnablersEnabled(cfg: AppConfig = config): boolean {
  return cfg.demoMode;
}

/**
 * Resolves which datasource is in effect given the demo flag and whether a
 * production database is configured (docs/ASSUMPTIONS.md §13).
 */
export function activeDatasource(cfg: AppConfig = config): 'demo' | 'production' {
  if (cfg.demoMode) return 'demo';
  return cfg.databaseUrlPostgres ? 'production' : 'demo';
}
