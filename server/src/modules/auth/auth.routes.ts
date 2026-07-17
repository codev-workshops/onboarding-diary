import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import { getUser } from '../users/users.service.js';
import { login, loginSchema } from './auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    res.json(await login(prisma, input));
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = requireUser(req);
    res.json(await getUser(prisma, user.sub));
  }),
);
