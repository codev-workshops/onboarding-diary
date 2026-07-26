import { dashboardQuery } from '@onboarding-diary/shared';
import { Router } from 'express';

import { callerOf } from '../../lib/caller.js';
import type { Db } from '../../lib/prisma.js';
import { requireRole } from '../../middleware/requireRole.js';
import { defineRoute } from '../../middleware/validate.js';
import * as dashboardService from './service.js';

export function dashboardRouter(db: Db): Router {
  const router = Router();

  router.get('/admin', requireRole('ADMIN'), async (_req, res) => {
    res.json({ data: await dashboardService.getAdminDashboard(db) });
  });

  router.get(
    '/',
    defineRoute({ query: dashboardQuery }, async ({ query, req, res }) => {
      res.json({ data: await dashboardService.getDashboard(db, callerOf(req), query.ownerId) });
    }),
  );

  return router;
}
