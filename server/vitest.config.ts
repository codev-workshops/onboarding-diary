import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    // DB-backed suites create their own SQLite files; keep them serial to avoid
    // exhausting resources and to keep output deterministic.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
