/**
 * Integration-test database access. Every suite shares one migrated database and starts
 * from a truncated state, so suites cannot see each other's rows (T-037).
 */

import { createPrismaClient, type Db } from '../../src/lib/prisma.js';

const TABLES = [
  'NoteTag',
  'Tag',
  'Note',
  'FeedbackNote',
  'IssueEntry',
  'TaskEntry',
  'RefreshToken',
  'User',
] as const;

let client: Db | undefined;

export function testDatabaseUrl(): string {
  const url = process.env['TEST_DATABASE_URL'];
  if (url === undefined || url.length === 0) {
    throw new Error('TEST_DATABASE_URL must be set to run the integration tests');
  }
  return url;
}

export function getTestDb(): Db {
  client ??= createPrismaClient(testDatabaseUrl());
  return client;
}

export async function resetDatabase(): Promise<void> {
  const db = getTestDb();
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnectTestDb(): Promise<void> {
  if (client !== undefined) {
    await client.$disconnect();
    client = undefined;
  }
}
