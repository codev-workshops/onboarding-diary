import { createTaskBody, listTasksQuery, updateTaskBody } from '@onboarding-diary/shared';
import { Router } from 'express';
import { z } from 'zod';

import { callerOf } from '../../lib/caller.js';
import { resolvePageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { defineRoute } from '../../middleware/validate.js';
import * as taskService from './service.js';

const idParams = z.object({ id: z.uuid('Must be a valid identifier') });

export function tasksRouter(db: Db): Router {
  const router = Router();

  router.get(
    '/',
    defineRoute({ query: listTasksQuery }, async ({ query, req, res }) => {
      const { data, meta } = await taskService.listTasks(
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
    defineRoute({ body: createTaskBody }, async ({ body, req, res }) => {
      res.status(201).json({ data: await taskService.createTask(db, callerOf(req), body) });
    }),
  );

  router.get(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      res.json({ data: await taskService.readTask(db, callerOf(req), params.id) });
    }),
  );

  router.patch(
    '/:id',
    defineRoute({ params: idParams, body: updateTaskBody }, async ({ params, body, req, res }) => {
      res.json({ data: await taskService.updateTask(db, callerOf(req), params.id, body) });
    }),
  );

  router.delete(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      await taskService.deleteTask(db, callerOf(req), params.id);
      res.status(204).send();
    }),
  );

  return router;
}
