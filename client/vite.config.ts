import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Exclude non-testable bootstrap and pure type/declaration modules.
      exclude: ['src/main.tsx', 'src/lib/types.ts', 'src/vite-env.d.ts', 'src/test/**'],
      reporter: ['text-summary'],
    },
  },
});
