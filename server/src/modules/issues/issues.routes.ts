import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import {
  createIssue,
  deleteIssue,
  getIssue,
  issueCreateSchema,
  issueFilterSchema,
  issueUpdateSchema,
  listIssues,
  updateIssue,
} from './issues.service.js';

export const issuesRouter = Router();

issuesRouter.use(authenticate);

issuesRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const filter = issueFilterSchema.parse(req.query);
    res.json(await listIssues(prisma, requireUser(req), filter));
  }),
);

issuesRouter.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getIssue(prisma, requireUser(req), req.params.id));
  }),
);

issuesRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = issueCreateSchema.parse(req.body);
    res.status(201).json(await createIssue(prisma, requireUser(req), input));
  }),
);

issuesRouter.put(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = issueUpdateSchema.parse(req.body);
    res.json(await updateIssue(prisma, requireUser(req), req.params.id, input));
  }),
);

issuesRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteIssue(prisma, requireUser(req), req.params.id);
    res.status(204).end();
  }),
);
