import { Router } from 'express';
import { Role } from '@onboarding-diary/shared';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';
import * as dashboardController from './dashboard.controller.js';

const router = Router();

router.use(authMiddleware);

// Recruit dashboard — RECRUIT role only
router.get('/recruit', rbac([Role.RECRUIT]), dashboardController.recruitDashboard);

// Manager dashboard — MANAGER and ADMIN
router.get('/manager', rbac([Role.MANAGER, Role.ADMIN]), dashboardController.managerDashboard);

// Admin dashboard — ADMIN only
router.get('/admin', rbac([Role.ADMIN]), dashboardController.adminDashboard);

export { router as dashboardRoutes };
