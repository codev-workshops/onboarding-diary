import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    // The unit suite never touches Postgres; these only satisfy the env parser
    // that every module transitively imports.
    env: {
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/test?schema=public',
      SESSION_SECRET: 'vitest-only-insecure-secret-0123456789abcdef',
    },
    include: ['tests/unit/**/*.spec.ts', 'tests/api/**/*.spec.ts'],
    // Playwright owns tests/e2e; without this exclusion Vitest would try to
    // collect them and fail on the Playwright-only globals.
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
