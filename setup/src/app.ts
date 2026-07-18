import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type Express } from 'express';
import { ZodError } from 'zod';
import { isDemoEnvironment } from './env.js';
import { provisionRequestSchema, runProvision, type RunDeps } from './service.js';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '../public');

/**
 * The one-off setup tool's HTTP surface. Kept entirely separate from the data
 * API so the running production server has no provisioning code (SECURITY_REVIEW.md).
 * `deps` is injectable for tests.
 */
export function createSetupApp(deps?: RunDeps): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', tool: 'setup' });
  });

  app.post('/provision', (req, res) => {
    void (async () => {
      try {
        // Defense in depth: never provision from an environment that is already
        // in production (docs/ASSUMPTIONS.md §13).
        if (!isDemoEnvironment()) {
          res.status(403).json({ error: 'Setup is only available in demo mode' });
          return;
        }
        const input = provisionRequestSchema.parse(req.body);
        const result = await runProvision(input, deps);
        res.status(200).json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({ error: 'Invalid request', details: err.flatten() });
          return;
        }
        res.status(400).json({ error: (err as Error).message });
      }
    })();
  });

  app.use(express.static(PUBLIC_DIR));
  return app;
}
