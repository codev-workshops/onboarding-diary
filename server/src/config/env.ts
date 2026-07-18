import { config as loadEnv } from 'dotenv';

loadEnv();

/** The placeholder JWT secret shipped for demo/dev; rejected in production. */
export const DEFAULT_JWT_SECRET = 'dev-only-change-me';

export interface AppConfig {
  /**
   * Production database connection string. Its presence is the single source of
   * truth for the mode (docs/ASSUMPTIONS.md §13): set → production; unset → demo.
   */
  dbString: string | undefined;
  /** SQLite datasource used in demo mode (never operator-facing). */
  demoDatabaseUrl: string;
  /** Derived: demo mode is on exactly when no production DB string is configured. */
  demoMode: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  port: number;
  corsOrigin: string;
}

const dbString = process.env.DB_STRING?.trim() || undefined;

export const config: AppConfig = {
  dbString,
  demoDatabaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  demoMode: !dbString,
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};

/** True when a connection string targets SQLite (demo default, and test DBs). */
export function isSqliteUrl(url: string): boolean {
  return url.startsWith('file:');
}

/**
 * Resolves whether onboarding enablers should be active. Enablers are on only in
 * demo mode, i.e. when no production DB string is set (docs/ASSUMPTIONS.md §2, §13).
 */
export function onboardingEnablersEnabled(cfg: AppConfig = config): boolean {
  return cfg.demoMode;
}

/**
 * Resolves which datasource is in effect. Driven solely by whether a production
 * DB string is configured (docs/ASSUMPTIONS.md §13).
 */
export function activeDatasource(cfg: AppConfig = config): 'demo' | 'production' {
  return cfg.demoMode ? 'demo' : 'production';
}
