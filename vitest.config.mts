import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts', 'tests/api/**/*.spec.ts'],
    // Playwright owns tests/e2e; without this exclusion Vitest would try to
    // collect them and fail on the Playwright-only globals.
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
