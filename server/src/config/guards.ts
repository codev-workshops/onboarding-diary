import type { Db } from '../db/prisma.js';
import { type AppConfig, DEFAULT_JWT_SECRET, config } from './env.js';
import { MODE_SETTING_KEY, PRODUCTION_MODE_VALUE } from '../domain/mode.js';

/** Minimum acceptable length for a production JWT secret. */
const MIN_JWT_SECRET_LENGTH = 16;

/** Whether the production one-way latch (`Setting.mode=production`) is set. */
async function isProductionLatched(db: Db): Promise<boolean> {
  const setting = await db.setting.findUnique({ where: { key: MODE_SETTING_KEY } });
  return setting?.value === PRODUCTION_MODE_VALUE;
}

/** Whether at least one Admin user exists. */
async function hasAdminUser(db: Db): Promise<boolean> {
  const admin = await db.user.findFirst({ where: { role: 'Admin' } });
  return admin !== null;
}

/**
 * Refuses to run in production with a weak/placeholder JWT secret — otherwise a
 * misconfigured deploy would let anyone forge tokens (SECURITY_REVIEW.md).
 * A no-op in demo mode. Throws with an actionable message on failure.
 */
export function assertJwtSecretStrong(cfg: AppConfig = config): void {
  if (cfg.demoMode) return;
  if (cfg.jwtSecret === DEFAULT_JWT_SECRET || cfg.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set to a strong value (>= ${MIN_JWT_SECRET_LENGTH} chars) in production. ` +
        'Re-run the setup tool or set a strong JWT_SECRET before starting.',
    );
  }
}

/**
 * Enforces the invariant "DB_STRING present ⇒ a provisioned database with an
 * admin". If the production DB is missing its schema/latch/admin (e.g. someone
 * set DB_STRING without running the setup tool), it throws rather than silently
 * re-provisioning or falling back to demo (docs/ASSUMPTIONS.md §13). The server
 * only ever reads this state — it never provisions. A no-op in demo mode.
 */
export async function assertProvisioned(db: Db, cfg: AppConfig = config): Promise<void> {
  if (cfg.demoMode) return;
  let latched: boolean;
  let admin: boolean;
  try {
    latched = await isProductionLatched(db);
    admin = await hasAdminUser(db);
  } catch (err) {
    throw new Error(
      'DB_STRING is set but the database could not be read. Ensure it is reachable and ' +
        `provisioned via the setup tool first. Cause: ${(err as Error).message}`,
    );
  }
  if (!latched || !admin) {
    throw new Error(
      'DB_STRING is set but the database is not provisioned (missing production latch or ' +
        'admin user). Run the setup tool to initialize it before starting in production.',
    );
  }
}
