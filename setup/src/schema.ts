import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSqliteUrl } from './db.js';

/** The server package directory (holds the Prisma schemas the tool applies). */
export const SERVER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../server');

/**
 * Applies the schema to the target database, creating tables if missing. Uses the
 * server's Prisma schemas (SQLite default, or `schema.postgres.prisma` for
 * Postgres). Additive — `db push` creates missing objects without dropping data.
 */
export function applySchema(dbString: string): void {
  if (isSqliteUrl(dbString)) {
    execSync('npx prisma db push --skip-generate', {
      cwd: SERVER_DIR,
      env: { ...process.env, DATABASE_URL: dbString },
      stdio: 'ignore',
    });
  } else {
    execSync('npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate', {
      cwd: SERVER_DIR,
      env: { ...process.env, DATABASE_URL_POSTGRES: dbString },
      stdio: 'ignore',
    });
  }
}
