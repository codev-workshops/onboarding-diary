import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  taskCreateSchema,
  taskFilterSchema,
  taskUpdateSchema,
  updateTask,
} from './tasks.service.js';

export const tasksRouter = Router();

tasksRouter.use(authenticate);

tasksRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const filter = taskFilterSchema.parse(req.query);
    res.json(await listTasks(prisma, requireUser(req), filter));
  }),
);

tasksRouter.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getTask(prisma, requireUser(req), req.params.id));
  }),
);

tasksRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = taskCreateSchema.parse(req.body);
    res.status(201).json(await createTask(prisma, requireUser(req), input));
  }),
);

tasksRouter.put(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = taskUpdateSchema.parse(req.body);
    res.json(await updateTask(prisma, requireUser(req), req.params.id, input));
  }),
);

tasksRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteTask(prisma, requireUser(req), req.params.id);
    res.status(204).end();
  }),
);
