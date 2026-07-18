import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, authorize, type AuthedRequest } from '../../http/authMiddleware.js';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from './categories.service.js';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

// All authenticated users can read categories (needed to create tasks).
categoriesRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const includeInactive = req.user?.role === 'Admin' && req.query.includeInactive === 'true';
    res.json(await listCategories(prisma, { includeInactive }));
  }),
);

// Management endpoints are Admin-only (docs/ASSUMPTIONS.md §4 Tier 1).
categoriesRouter.post(
  '/',
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const input = categoryCreateSchema.parse(req.body);
    res.status(201).json(await createCategory(prisma, input));
  }),
);

categoriesRouter.put(
  '/:id',
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const input = categoryUpdateSchema.parse(req.body);
    res.json(await updateCategory(prisma, req.params.id, input));
  }),
);

categoriesRouter.delete(
  '/:id',
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    res.json(await deleteCategory(prisma, req.params.id));
  }),
);
