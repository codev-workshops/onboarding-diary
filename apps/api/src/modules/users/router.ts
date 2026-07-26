import { listUsersQuery, updateOwnProfileBody, updateUserBody } from '@onboarding-diary/shared';
import { Router } from 'express';
import { z } from 'zod';

import { callerOf } from '../../lib/caller.js';
import { resolvePageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { requireRole } from '../../middleware/requireRole.js';
import { defineRoute } from '../../middleware/validate.js';
import * as userService from './service.js';

const idParams = z.object({ id: z.uuid('Must be a valid identifier') });

export function usersRouter(db: Db): Router {
  const router = Router();

  router.get('/me', async (req, res) => {
    res.json({ data: await userService.getUserById(db, callerOf(req).id) });
  });

  router.patch(
    '/me',
    defineRoute({ body: updateOwnProfileBody }, async ({ body, req, res }) => {
      res.json({ data: await userService.updateOwnProfile(db, callerOf(req).id, body) });
    }),
  );

  router.get('/me/direct-reports', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
    res.json({ data: await userService.listDirectReports(db, callerOf(req).id) });
  });

  router.get(
    '/',
    requireRole('ADMIN'),
    defineRoute({ query: listUsersQuery }, async ({ query, res }) => {
      const { data, meta } = await userService.listUsers(db, query, resolvePageParams(query));
      res.json({ data, meta });
    }),
  );

  router.get(
    '/:id',
    defineRoute({ params: idParams }, async ({ params, req, res }) => {
      res.json({ data: await userService.readUser(db, callerOf(req), params.id) });
    }),
  );

  router.patch(
    '/:id',
    requireRole('ADMIN'),
    defineRoute({ params: idParams, body: updateUserBody }, async ({ params, body, req, res }) => {
      res.json({ data: await userService.updateUserAsAdmin(db, callerOf(req), params.id, body) });
    }),
  );

  return router;
}
