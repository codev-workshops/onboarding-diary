import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import { buildClient, type Db } from './db.js';
import { applySchema, SERVER_DIR } from './schema.js';
import { provisionProduction } from './provision.js';
import { readExistingJwtSecret, upsertEnvVars } from './envFile.js';

export const provisionRequestSchema = z.object({
  dbString: z.string().min(1),
  adminEmail: z.string().email(),
  adminName: z.string().min(1).max(200),
  adminPassword: z.string().min(1),
  timezone: z.string().optional(),
});

export type ProvisionRequest = z.infer<typeof provisionRequestSchema>;

export interface ProvisionResponse {
  categoriesCreated: number;
  adminCreated: boolean;
  adminEmail: string;
  /** Whether `.env` was written locally (on-prem convenience). */
  envWritten: boolean;
  envPath: string;
  /** Whether a fresh JWT secret was generated (vs. reusing an existing one). */
  jwtSecretGenerated: boolean;
  /**
   * The generated JWT secret — returned to the (local) operator ONLY when it was
   * freshly generated, so they can set it as a platform env var on cloud. When an
   * existing secret is reused it is never echoed back. The DB connection string is
   * never echoed (the operator supplied it). Secrets are never logged.
   */
  jwtSecret?: string;
  restartRequired: true;
}

/** Injectable side effects so the orchestration can be unit-tested. */
export interface RunDeps {
  applySchema(dbString: string): void;
  buildClient(dbString: string): Db;
  writeEnv(path: string, vars: Record<string, string>): void;
  readJwtSecret(path: string): string | undefined;
  generateSecret(): string;
  envPath: string;
}

export const defaultDeps: RunDeps = {
  applySchema,
  buildClient,
  writeEnv: (path, vars) => {
    upsertEnvVars(path, vars);
  },
  readJwtSecret: readExistingJwtSecret,
  generateSecret: () => randomBytes(32).toString('hex'),
  envPath: join(SERVER_DIR, '.env'),
};

/**
 * Performs the demo→production cutover (docs/ASSUMPTIONS.md §13): applies the
 * schema to the target DB, seeds reference data, creates the first admin, sets
 * the one-way latch, and writes the server's `.env` (on-prem). On cloud the
 * write is best-effort — the returned `dbString`/`jwtSecret` must be set as
 * platform env vars instead. The server must be restarted afterward to switch
 * its live connection.
 */
export async function runProvision(
  input: ProvisionRequest,
  deps: RunDeps = defaultDeps,
): Promise<ProvisionResponse> {
  deps.applySchema(input.dbString);

  const db = deps.buildClient(input.dbString);
  let result;
  try {
    result = await provisionProduction(db, {
      adminEmail: input.adminEmail,
      adminName: input.adminName,
      adminPassword: input.adminPassword,
      timezone: input.timezone,
    });
  } finally {
    await db.$disconnect();
  }

  const existingSecret = deps.readJwtSecret(deps.envPath);
  const jwtSecret = existingSecret ?? deps.generateSecret();
  const jwtSecretGenerated = existingSecret === undefined;
  let envWritten = false;
  try {
    deps.writeEnv(deps.envPath, { DB_STRING: input.dbString, JWT_SECRET: jwtSecret });
    envWritten = true;
  } catch {
    // Read-only / ephemeral filesystem (typical on cloud) — the operator must set
    // the env vars in their platform instead.
    envWritten = false;
  }

  return {
    categoriesCreated: result.categoriesCreated,
    adminCreated: result.adminCreated,
    adminEmail: result.adminEmail,
    envWritten,
    envPath: deps.envPath,
    jwtSecretGenerated,
    // Only surface a freshly-generated secret; never echo a reused one.
    jwtSecret: jwtSecretGenerated ? jwtSecret : undefined,
    restartRequired: true,
  };
}
