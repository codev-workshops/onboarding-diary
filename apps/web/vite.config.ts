import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The monorepo keeps one .env at the root, so VITE_* vars live there rather than in apps/web.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  server: { host: true, port: 5173 },
  preview: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
});
