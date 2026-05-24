import { Router } from 'express';
import {
  assignManagerSchema,
  unassignManagerSchema,
  assignmentListQuerySchema,
  Role,
} from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';
import * as assignmentsController from './assignments.controller.js';

const router = Router();

// All assignment routes require authentication
router.use(authMiddleware);

// Create assignment — ADMIN only
router.post(
  '/',
  rbac([Role.ADMIN]),
  validate(assignManagerSchema),
  assignmentsController.create,
);

// List assignments (with filters) — ADMIN and MANAGER
router.get(
  '/',
  rbac([Role.ADMIN, Role.MANAGER]),
  validate(assignmentListQuerySchema, 'query'),
  assignmentsController.list,
);

// Get single assignment — ADMIN and MANAGER
router.get(
  '/:id',
  rbac([Role.ADMIN, Role.MANAGER]),
  assignmentsController.getById,
);

// Unassign (deactivate) — ADMIN only
router.patch(
  '/:id/unassign',
  rbac([Role.ADMIN]),
  validate(unassignManagerSchema),
  assignmentsController.unassign,
);

// Get recruits assigned to a manager — ADMIN or the manager themselves
router.get(
  '/manager/:managerId/recruits',
  rbac([Role.ADMIN, Role.MANAGER]),
  assignmentsController.getRecruitsForManager,
);

// Get managers assigned to a recruit — ADMIN, MANAGER, or the recruit themselves
router.get(
  '/recruit/:recruitId/managers',
  rbac([Role.ADMIN, Role.MANAGER, Role.RECRUIT]),
  assignmentsController.getManagersForRecruit,
);

export { router as assignmentsRoutes };
