import { Router } from 'express';
import {
  createIssueEntrySchema,
  updateIssueEntrySchema,
  issueListParamsSchema,
} from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import * as issuesController from './issues.controller.js';

const router = Router();

// All issue routes require authentication
router.use(authMiddleware);

// List issues — all roles (scoped by role in service layer)
router.get('/', validate(issueListParamsSchema, 'query'), issuesController.list);

// Create issue — all roles (creates under own user)
router.post('/', validate(createIssueEntrySchema), issuesController.create);

// Get issue by ID — access checked in service layer
router.get('/:id', issuesController.getById);

// Update issue — owner or ADMIN (checked in service)
router.patch('/:id', validate(updateIssueEntrySchema), issuesController.update);

// Delete issue (soft) — owner or ADMIN (checked in service)
router.delete('/:id', issuesController.remove);

export { router as issuesRoutes };
