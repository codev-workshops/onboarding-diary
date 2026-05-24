import { Router } from 'express';
import {
  createReportSchema,
  updateReportSchema,
  reportListParamsSchema,
  downloadReportParamsSchema,
} from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import * as reportsController from './reports.controller.js';

const router = Router();

router.use(authMiddleware);

// List reports — all roles (scoped in service)
router.get('/', validate(reportListParamsSchema, 'query'), reportsController.list);

// Generate report — all roles (permission checked in service)
router.post('/', validate(createReportSchema), reportsController.generate);

// Get report by ID — access checked in service
router.get('/:id', reportsController.getById);

// Download report as PDF or CSV
router.get('/:id/download', validate(downloadReportParamsSchema, 'query'), reportsController.download);

// Update report — creator or ADMIN
router.patch('/:id', validate(updateReportSchema), reportsController.update);

// Soft delete report — creator or ADMIN
router.delete('/:id', reportsController.remove);

export { router as reportsRoutes };
