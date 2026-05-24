import { Router } from 'express';
import { analyticsParamsSchema } from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import * as analyticsController from './analytics.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', validate(analyticsParamsSchema, 'query'), analyticsController.overview);
router.get('/tasks', validate(analyticsParamsSchema, 'query'), analyticsController.taskTrends);
router.get('/issues', validate(analyticsParamsSchema, 'query'), analyticsController.issueTrends);
router.get(
  '/feedback',
  validate(analyticsParamsSchema, 'query'),
  analyticsController.feedbackSentiment,
);
router.get(
  '/activity',
  validate(analyticsParamsSchema, 'query'),
  analyticsController.recruitActivity,
);

export { router as analyticsRoutes };
