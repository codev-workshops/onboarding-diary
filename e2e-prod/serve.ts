import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { applySchema } from '../setup/src/schema.js';
import { buildClient } from '../setup/src/db.js';
import { provisionProduction } from '../setup/src/provision.js';
import { PROD_ADMIN } from './constants.js';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * Long-running helper used as the production e2e `webServer`. It boots a real
 * PostgreSQL container, performs the demo→production cutover via the SAME
 * setup-tool core the browser form uses (apply schema, seed reference categories,
 * create the first admin, set the `Setting.mode=production` latch), then starts the
 * API in PRODUCTION mode against it. Running as its own `tsx` process (not from the
 * Playwright config) keeps ESM-only deps like testcontainers working. Playwright
 * waits for port 4000, and terminates this process on teardown — we stop the child
 * server and the container in the signal handler (docs/TESTING_STRATEGY.md).
 */
let container: StartedPostgreSqlContainer | undefined;
let server: ChildProcess | undefined;

async function shutdown(code = 0): Promise<void> {
  if (server && !server.killed) server.kill('SIGTERM');
  if (container) {
    try {
      await container.stop();
    } catch {
      // Best effort.
    }
  }
  process.exit(code);
}

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => {
    void shutdown(0);
  });
}

async function main(): Promise<void> {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const url = container.getConnectionUri();

  applySchema(url);
  const db = buildClient(url);
  try {
    await provisionProduction(db, {
      adminEmail: PROD_ADMIN.email,
      adminName: PROD_ADMIN.name,
      adminPassword: PROD_ADMIN.password,
    });
  } finally {
    await db.$disconnect();
  }

  server = spawn('npm', ['--workspace', 'server', 'run', 'dev'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      DB_STRING: url,
      JWT_SECRET: 'e2e-prod-secret-strong-value',
      PORT: '4000',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  });
  server.on('exit', (code) => {
    void shutdown(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  void shutdown(1);
});
