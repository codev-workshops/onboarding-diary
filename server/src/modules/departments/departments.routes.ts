import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, authorize } from '../../http/authMiddleware.js';
import {
  createDepartment,
  deleteDepartment,
  departmentCreateSchema,
  departmentUpdateSchema,
  listDepartments,
  updateDepartment,
} from './departments.service.js';

export const departmentsRouter = Router();

departmentsRouter.use(authenticate);

// Reading departments is available to all authenticated users; management is Admin-only.
departmentsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listDepartments(prisma));
  }),
);

departmentsRouter.post(
  '/',
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const input = departmentCreateSchema.parse(req.body);
    res.status(201).json(await createDepartment(prisma, input));
  }),
);

departmentsRouter.put(
  '/:id',
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const input = departmentUpdateSchema.parse(req.body);
    res.json(await updateDepartment(prisma, req.params.id, input));
  }),
);

departmentsRouter.delete(
  '/:id',
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    await deleteDepartment(prisma, req.params.id);
    res.status(204).end();
  }),
);
