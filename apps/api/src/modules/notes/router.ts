import { createNoteBody, listNotesQuery, updateNoteBody } from '@onboarding-diary/shared';
import { Router } from 'express';
import { z } from 'zod';

import { callerOf } from '../../lib/caller.js';
import { resolvePageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { defineRoute } from '../../middleware/validate.js';
import * as noteService from './service.js';

const idParams = z.object({ id: z.uuid('Must be a valid identifier') });

export function notesRouter(db: Db): Router {
  const router = Router();

  router.get(
    '/',
    defineRoute({ query: listNotesQuery }, async ({ query, req, res }) => {
      const { data, meta } = await noteService.listNotes(
        db,
        callerOf(req),
        query,
        resolvePageParams(query),
      );
      res.json({ data, meta });
    }),
  );

  router.post(
    '/',
    defineRoute({ body: createNoteBody }, async ({ body, req, res }) => {
      res.status(201).json({ data: await noteService.createNote(db, callerOf(req), body) });
    }),
  );

  router.get(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      res.json({ data: await noteService.readNote(db, callerOf(req), params.id) });
    }),
  );

  router.patch(
    '/:id',
    defineRoute({ params: idParams, body: updateNoteBody }, async ({ params, body, req, res }) => {
      res.json({ data: await noteService.updateNote(db, callerOf(req), params.id, body) });
    }),
  );

  router.delete(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      await noteService.deleteNote(db, callerOf(req), params.id);
      res.status(204).send();
    }),
  );

  return router;
}
