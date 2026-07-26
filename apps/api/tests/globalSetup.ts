/**
 * Create the integration-test database if it does not exist and bring it up to the latest
 * migration before any suite runs.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new Error(`${name} must be set`);
  return value;
}

async function ensureDatabaseExists(url: string): Promise<void> {
  const parsed = new URL(url);
  const databaseName = parsed.pathname.replace(/^\//, '');
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}

export async function setup(): Promise<void> {
  const testDatabaseUrl = requiredEnv('TEST_DATABASE_URL');
  await ensureDatabaseExists(testDatabaseUrl);
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'inherit',
  });
}
