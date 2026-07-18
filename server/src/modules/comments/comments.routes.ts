import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import { commentCreateSchema, createComment, listComments } from './comments.service.js';

// Mounted at /api/tasks/:taskId/comments (mergeParams to read :taskId).
export const commentsRouter = Router({ mergeParams: true });

commentsRouter.use(authenticate);

commentsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await listComments(prisma, requireUser(req), req.params.taskId));
  }),
);

commentsRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = commentCreateSchema.parse(req.body);
    res.status(201).json(await createComment(prisma, requireUser(req), req.params.taskId, input));
  }),
);
