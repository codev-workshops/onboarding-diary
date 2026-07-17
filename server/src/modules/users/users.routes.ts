import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, authorize } from '../../http/authMiddleware.js';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
  userCreateSchema,
  userUpdateSchema,
} from './users.service.js';

export const usersRouter = Router();

// User provisioning is Admin-only (docs/ASSUMPTIONS.md §10).
usersRouter.use(authenticate, authorize('Admin'));

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listUsers(prisma));
  }),
);

usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getUser(prisma, req.params.id));
  }),
);

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = userCreateSchema.parse(req.body);
    res.status(201).json(await createUser(prisma, input));
  }),
);

usersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = userUpdateSchema.parse(req.body);
    res.json(await updateUser(prisma, req.params.id, input));
  }),
);

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteUser(prisma, req.params.id);
    res.status(204).end();
  }),
);
