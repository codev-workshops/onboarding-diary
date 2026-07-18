import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  noteCreateSchema,
  noteFilterSchema,
  noteUpdateSchema,
  updateNote,
} from './notes.service.js';

export const notesRouter = Router();

notesRouter.use(authenticate);

notesRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const filter = noteFilterSchema.parse(req.query);
    res.json(await listNotes(prisma, requireUser(req), filter));
  }),
);

notesRouter.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getNote(prisma, requireUser(req), req.params.id));
  }),
);

notesRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = noteCreateSchema.parse(req.body);
    res.status(201).json(await createNote(prisma, requireUser(req), input));
  }),
);

notesRouter.put(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = noteUpdateSchema.parse(req.body);
    res.json(await updateNote(prisma, requireUser(req), req.params.id, input));
  }),
);

notesRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteNote(prisma, requireUser(req), req.params.id);
    res.status(204).end();
  }),
);
