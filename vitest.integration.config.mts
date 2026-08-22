import { loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * The integration suite talks to a migrated and seeded Postgres, so it is a
 * separate project from `npm test`: unit tests must stay runnable with no
 * infrastructure, and CI runs this one only after `db:deploy` and `db:seed`.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [tsconfigPaths()],
    test: {
      environment: 'node',
      include: ['tests/integration/**/*.spec.ts'],
      // Fixtures such as the manager reassignment in AZ-M8 mutate shared seed
      // rows, so files must not race each other.
      fileParallelism: false,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? env.DATABASE_URL ?? '',
        SESSION_SECRET: process.env.SESSION_SECRET ?? env.SESSION_SECRET ?? '',
      },
    },
  };
});
