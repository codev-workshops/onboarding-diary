import { Router } from 'express';
import {
  createTaskEntrySchema,
  updateTaskEntrySchema,
  taskListParamsSchema,
} from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import * as tasksController from './tasks.controller.js';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// List tasks — all roles (scoped by role in service layer)
router.get('/', validate(taskListParamsSchema, 'query'), tasksController.list);

// Create task — all roles (creates under own user)
router.post('/', validate(createTaskEntrySchema), tasksController.create);

// Get task by ID — access checked in service layer
router.get('/:id', tasksController.getById);

// Update task — owner or ADMIN (checked in service)
router.patch('/:id', validate(updateTaskEntrySchema), tasksController.update);

// Delete task (soft) — owner or ADMIN (checked in service)
router.delete('/:id', tasksController.remove);

export { router as tasksRoutes };
