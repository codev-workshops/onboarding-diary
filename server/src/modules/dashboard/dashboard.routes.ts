import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import { getDashboardSummary } from './dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getDashboardSummary(prisma, requireUser(req)));
  }),
);
