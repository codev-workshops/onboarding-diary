/** Process entrypoint: validate configuration, connect, and listen (TRD 7). */

import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';
import { createLogger } from './lib/logger.js';
import { createPrismaClient } from './lib/prisma.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const db = createPrismaClient(config.DATABASE_URL);

  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    logger.error({ err: error }, 'Database unreachable at startup');
    process.exitCode = 1;
    return;
  }

  const app = createApp({ db, config, logger });
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'API listening');
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => {
      void db.$disconnect().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
