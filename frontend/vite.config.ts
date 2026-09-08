import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiProxy = {
  '/api': {
    target: 'http://localhost:5276',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: apiProxy },
  // `vite preview` serves the built app for the Playwright suite and needs the same proxy.
  preview: { proxy: apiProxy },
  test: {
    // Playwright owns `e2e/`; Vitest would otherwise try to run those specs.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
