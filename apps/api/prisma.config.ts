import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Environment lives in the repo-root .env so the API, the web app, and Compose share it.
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
