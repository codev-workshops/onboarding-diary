import { Router } from 'express';
import {
  createFeedbackSchema,
  updateFeedbackSchema,
  feedbackListParamsSchema,
} from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import * as feedbackController from './feedback.controller.js';

const router = Router();

router.use(authMiddleware);

// List feedback — all roles (scoped in service)
router.get('/', validate(feedbackListParamsSchema, 'query'), feedbackController.list);

// Create feedback — all roles (author = authenticated user)
router.post('/', validate(createFeedbackSchema), feedbackController.create);

// Get by ID — author, subject, or ADMIN
router.get('/:id', feedbackController.getById);

// Update — author or ADMIN
router.patch('/:id', validate(updateFeedbackSchema), feedbackController.update);

// Soft delete — author or ADMIN
router.delete('/:id', feedbackController.remove);

export { router as feedbackRoutes };
