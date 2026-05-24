import { Router } from 'express';
import {
  createNoteEntrySchema,
  updateNoteEntrySchema,
  noteListParamsSchema,
} from '@onboarding-diary/shared';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import * as notesController from './notes.controller.js';

const router = Router();

router.use(authMiddleware);

// List notes — all roles (scoped in service)
router.get('/', validate(noteListParamsSchema, 'query'), notesController.list);

// Create note — all roles (creates under own user)
router.post('/', validate(createNoteEntrySchema), notesController.create);

// Get by ID — access checked in service
router.get('/:id', notesController.getById);

// Update — owner or ADMIN
router.patch('/:id', validate(updateNoteEntrySchema), notesController.update);

// Soft delete — owner or ADMIN
router.delete('/:id', notesController.remove);

export { router as notesRoutes };
