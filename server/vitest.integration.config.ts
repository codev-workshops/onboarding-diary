import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.itest.ts'],
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 180000,
  },
});
