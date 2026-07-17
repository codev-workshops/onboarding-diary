import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import {
  authenticate,
  authorize,
  requireUser,
  type AuthedRequest,
} from '../../http/authMiddleware.js';
import { getDashboardSummary, getTeamOverview } from './dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getDashboardSummary(prisma, requireUser(req)));
  }),
);

dashboardRouter.get(
  '/team',
  authorize('Manager', 'Admin'),
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getTeamOverview(prisma, requireUser(req)));
  }),
);
