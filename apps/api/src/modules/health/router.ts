import { Router } from 'express';

import type { Db } from '../../lib/prisma.js';

/** Liveness plus a database round-trip; 503 when the database is unreachable (TRD 4.7). */
export function healthRouter(db: Db): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  });

  return router;
}
