import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import {
  createFeedback,
  deleteFeedback,
  feedbackCreateSchema,
  feedbackFilterSchema,
  feedbackUpdateSchema,
  getFeedback,
  listFeedback,
  updateFeedback,
} from './feedback.service.js';

export const feedbackRouter = Router();

feedbackRouter.use(authenticate);

feedbackRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const filter = feedbackFilterSchema.parse(req.query);
    res.json(await listFeedback(prisma, requireUser(req), filter));
  }),
);

feedbackRouter.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getFeedback(prisma, requireUser(req), req.params.id));
  }),
);

feedbackRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = feedbackCreateSchema.parse(req.body);
    res.status(201).json(await createFeedback(prisma, requireUser(req), input));
  }),
);

feedbackRouter.put(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = feedbackUpdateSchema.parse(req.body);
    res.json(await updateFeedback(prisma, requireUser(req), req.params.id, input));
  }),
);

feedbackRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteFeedback(prisma, requireUser(req), req.params.id);
    res.status(204).end();
  }),
);
