import { PrismaClient } from '@prisma/client';
import { PrismaClient as PgPrismaClient } from '../../server/src/generated/pg/index.js';

/**
 * The Prisma client type used during provisioning. The Postgres-generated client
 * is structurally identical to the default (SQLite) one and is bridged to this
 * type when the target is Postgres.
 */
export type Db = PrismaClient;

/** True when a connection string targets SQLite (used by tests / on-prem SQLite). */
export function isSqliteUrl(url: string): boolean {
  return url.startsWith('file:');
}

/** Builds a Prisma client for the target connection string. */
export function buildClient(dbString: string): Db {
  if (isSqliteUrl(dbString)) {
    return new PrismaClient({ datasources: { db: { url: dbString } } });
  }
  return new PgPrismaClient({ datasources: { db: { url: dbString } } }) as unknown as Db;
}
