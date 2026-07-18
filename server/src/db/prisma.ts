import { PrismaClient } from '@prisma/client';
import { PrismaClient as PgPrismaClient } from '../generated/pg/index.js';
import { config, isSqliteUrl } from '../config/env.js';

/**
 * The application's Prisma client type. Services are typed against the default
 * (SQLite-generated) client; the Postgres-generated client is structurally
 * identical, so it is bridged to this type when running in production.
 */
export type Db = PrismaClient;

/**
 * Builds the Prisma client for the active datasource, driven solely by
 * `DB_STRING` (docs/ASSUMPTIONS.md §13):
 * - unset          → demo mode, SQLite at the demo database URL;
 * - `file:` URL    → SQLite at that URL (used by fast tests / on-prem SQLite);
 * - other URL      → production PostgreSQL via the pg-generated client.
 */
function createClient(): Db {
  const url = config.dbString;
  if (!url) {
    return new PrismaClient({ datasources: { db: { url: config.demoDatabaseUrl } } });
  }
  if (isSqliteUrl(url)) {
    return new PrismaClient({ datasources: { db: { url } } });
  }
  return new PgPrismaClient({ datasources: { db: { url } } }) as unknown as Db;
}

/**
 * Shared PrismaClient instance bound to the active datasource. Services accept a
 * `Db` so tests can inject an isolated client.
 */
export const prisma: Db = createClient();
