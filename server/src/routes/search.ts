import { Router } from 'express';
import type { AuthedRequest } from '../lib/auth.js';
import { requireAuth, visibleUserIds } from '../lib/auth.js';
import { ENTITIES } from '../lib/entities.js';
import { listEntries } from '../lib/queries.js';
import type { EntityName } from '../lib/types.js';

export const searchRouter = Router();

searchRouter.use(requireAuth);

const ENTITY_NAMES: ReadonlyArray<EntityName> = ['tasks', 'issues', 'feedback', 'notes'];

/** Cross-category search — one of the two post-core extensions. */
searchRouter.get('/', (req: AuthedRequest, res) => {
  const actor = req.user;
  if (!actor) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (term.length < 2) {
    res.json({
      query: term,
      results: { tasks: [], issues: [], feedback: [], notes: [] },
      total: 0,
    });
    return;
  }
  const userIds = visibleUserIds(actor);
  const results = Object.fromEntries(
    ENTITY_NAMES.map((name) => [
      name,
      listEntries(ENTITIES[name], { userIds, search: term, limit: 25 }),
    ]),
  ) as Record<EntityName, ReturnType<typeof listEntries>>;
  const total = ENTITY_NAMES.reduce((sum, name) => sum + results[name].length, 0);
  res.json({ query: term, results, total });
});
