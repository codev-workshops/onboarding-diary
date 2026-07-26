import { createIssueBody, listIssuesQuery, updateIssueBody } from '@onboarding-diary/shared';
import { Router } from 'express';
import { z } from 'zod';

import { callerOf } from '../../lib/caller.js';
import { resolvePageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { defineRoute } from '../../middleware/validate.js';
import * as issueService from './service.js';

const idParams = z.object({ id: z.uuid('Must be a valid identifier') });

export function issuesRouter(db: Db): Router {
  const router = Router();

  router.get(
    '/',
    defineRoute({ query: listIssuesQuery }, async ({ query, req, res }) => {
      const { data, meta } = await issueService.listIssues(
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
    defineRoute({ body: createIssueBody }, async ({ body, req, res }) => {
      res.status(201).json({ data: await issueService.createIssue(db, callerOf(req), body) });
    }),
  );

  router.get(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      res.json({ data: await issueService.readIssue(db, callerOf(req), params.id) });
    }),
  );

  router.patch(
    '/:id',
    defineRoute({ params: idParams, body: updateIssueBody }, async ({ params, body, req, res }) => {
      res.json({ data: await issueService.updateIssue(db, callerOf(req), params.id, body) });
    }),
  );

  router.delete(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      await issueService.deleteIssue(db, callerOf(req), params.id);
      res.status(204).send();
    }),
  );

  return router;
}
