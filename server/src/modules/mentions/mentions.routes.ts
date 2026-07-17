import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import {
  listMentions,
  markAllMentionsRead,
  markMentionRead,
  unreadMentionCount,
} from './mentions.service.js';

export const mentionsRouter = Router();

mentionsRouter.use(authenticate);

mentionsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const actor = requireUser(req);
    const [items, unread] = await Promise.all([
      listMentions(prisma, actor),
      unreadMentionCount(prisma, actor),
    ]);
    res.json({ items, unread });
  }),
);

mentionsRouter.post(
  '/read',
  asyncHandler(async (req: AuthedRequest, res) => {
    await markAllMentionsRead(prisma, requireUser(req));
    res.status(204).end();
  }),
);

mentionsRouter.post(
  '/:id/read',
  asyncHandler(async (req: AuthedRequest, res) => {
    await markMentionRead(prisma, requireUser(req), req.params.id);
    res.status(204).end();
  }),
);
