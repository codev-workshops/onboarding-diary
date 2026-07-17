import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, authorize } from '../../http/authMiddleware.js';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  templateCreateSchema,
  templateUpdateSchema,
  updateTemplate,
} from './templates.service.js';

export const templatesRouter = Router();

// Checklist templates are Admin-managed (docs/ASSUMPTIONS.md §17).
templatesRouter.use(authenticate, authorize('Admin'));

templatesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listTemplates(prisma));
  }),
);

templatesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getTemplate(prisma, req.params.id));
  }),
);

templatesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = templateCreateSchema.parse(req.body);
    res.status(201).json(await createTemplate(prisma, input));
  }),
);

templatesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = templateUpdateSchema.parse(req.body);
    res.json(await updateTemplate(prisma, req.params.id, input));
  }),
);

templatesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteTemplate(prisma, req.params.id);
    res.status(204).end();
  }),
);
