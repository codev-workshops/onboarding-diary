import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // The design tokens live outside the web workspace, in devin_context/.
    fs: { allow: [repoRoot] },
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
