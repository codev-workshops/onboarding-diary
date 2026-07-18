import { createApp } from './app.js';
import { config, activeDatasource } from './config/env.js';
import { prisma } from './db/prisma.js';
import { assertJwtSecretStrong, assertProvisioned } from './config/guards.js';

async function main(): Promise<void> {
  // In production, fail fast rather than start misconfigured or unprovisioned
  // (SECURITY_REVIEW.md; docs/ASSUMPTIONS.md §13).
  assertJwtSecretStrong(config);
  await assertProvisioned(prisma, config);

  const app = createApp();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `Onboarding Diary API listening on :${config.port} (datasource: ${activeDatasource()}, demoMode: ${config.demoMode})`,
    );
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
