import { defineConfig } from 'vitest/config';

// Coverage config that runs the unit/API and integration suites together so the
// reported numbers reflect the whole test pyramid. Integration suites need Docker.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts', 'test/integration/**/*.itest.ts'],
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 180000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/generated/**', 'src/index.ts'],
      reporter: ['text-summary'],
    },
  },
});
