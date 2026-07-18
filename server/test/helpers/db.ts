import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

/**
 * Creates an isolated SQLite database in a temp dir, applies the Prisma schema to
 * it, and returns a PrismaClient bound to it. Used by service/API tests so each
 * suite runs against a clean, independent database.
 */
export function createTestDb(): { prisma: PrismaClient; url: string } {
  const dir = mkdtempSync(join(tmpdir(), 'onboarding-test-'));
  const dbPath = join(dir, 'test.db');
  const url = `file:${dbPath}`;

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  return { prisma, url };
}

/** Removes all rows in FK-safe order. */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.task.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.note.deleteMany();
  await prisma.taskCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
}
