import { Router } from 'express';
import {
  updateProfileSchema,
  updateRecruitProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
  userListQuerySchema,
  Role,
} from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';
import { ownerOrRoles } from '../../middleware/ownerOrRoles.middleware.js';
import * as usersController from './users.controller.js';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// List users — ADMIN sees all, MANAGER sees all (needed for assignment UI)
router.get(
  '/',
  rbac([Role.ADMIN, Role.MANAGER]),
  validate(userListQuerySchema, 'query'),
  usersController.list,
);

// Get user by ID — own profile or ADMIN/MANAGER
router.get(
  '/:id',
  ownerOrRoles([Role.ADMIN, Role.MANAGER]),
  usersController.getById,
);

// Update user profile (first_name, last_name, avatar) — own profile or ADMIN
router.patch(
  '/:id/profile',
  ownerOrRoles([Role.ADMIN]),
  validate(updateProfileSchema),
  usersController.updateProfile,
);

// Update recruit profile (department, position, start_date, etc.) — own profile or ADMIN/MANAGER
router.patch(
  '/:id/recruit-profile',
  ownerOrRoles([Role.ADMIN, Role.MANAGER]),
  validate(updateRecruitProfileSchema),
  usersController.updateRecruitProfile,
);

// Update role — ADMIN only
router.patch(
  '/:id/role',
  rbac([Role.ADMIN]),
  validate(updateRoleSchema),
  usersController.updateRole,
);

// Update status — ADMIN only
router.patch(
  '/:id/status',
  rbac([Role.ADMIN]),
  validate(updateStatusSchema),
  usersController.updateStatus,
);

// Soft delete user — ADMIN only
router.delete(
  '/:id',
  rbac([Role.ADMIN]),
  usersController.remove,
);

export { router as usersRoutes };
