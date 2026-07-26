import {
  createFeedbackBody,
  listFeedbackQuery,
  updateFeedbackBody,
} from '@onboarding-diary/shared';
import { Router } from 'express';
import { z } from 'zod';

import { callerOf } from '../../lib/caller.js';
import { resolvePageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { defineRoute } from '../../middleware/validate.js';
import * as feedbackService from './service.js';

const idParams = z.object({ id: z.uuid('Must be a valid identifier') });

export function feedbackRouter(db: Db): Router {
  const router = Router();

  router.get(
    '/',
    defineRoute({ query: listFeedbackQuery }, async ({ query, req, res }) => {
      const { data, meta } = await feedbackService.listFeedback(
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
    defineRoute({ body: createFeedbackBody }, async ({ body, req, res }) => {
      res.status(201).json({ data: await feedbackService.createFeedback(db, callerOf(req), body) });
    }),
  );

  router.get(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      res.json({ data: await feedbackService.readFeedback(db, callerOf(req), params.id) });
    }),
  );

  router.patch(
    '/:id',
    defineRoute(
      { params: idParams, body: updateFeedbackBody },
      async ({ params, body, req, res }) => {
        res.json({
          data: await feedbackService.updateFeedback(db, callerOf(req), params.id, body),
        });
      },
    ),
  );

  router.delete(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      await feedbackService.deleteFeedback(db, callerOf(req), params.id);
      res.status(204).send();
    }),
  );

  return router;
}
