import { Router } from 'express';
import { globalSearchParamsSchema } from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import * as searchController from './search.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', validate(globalSearchParamsSchema, 'query'), searchController.search);

export { router as searchRoutes };
