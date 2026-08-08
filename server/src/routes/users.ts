import { Router } from 'express';
import { db } from '../db.js';
import type { AuthedRequest } from '../lib/auth.js';
import { requireAuth, requireRole, visibleUserIds } from '../lib/auth.js';
import type { UserRow } from '../lib/types.js';
import { toPublicUser } from '../lib/types.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

/** Users the actor may report on — used to populate the recruit selector. */
usersRouter.get('/', (req: AuthedRequest, res) => {
  const actor = req.user;
  if (!actor) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const ids = visibleUserIds(actor);
  if (ids.length === 0) {
    res.json({ users: [] });
    return;
  }
  const rows = db
    .prepare(
      `SELECT * FROM users WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY name COLLATE NOCASE`,
    )
    .all(...ids) as UserRow[];
  res.json({ users: rows.map(toPublicUser) });
});

/** Managers to pick from when editing a profile. */
usersRouter.get('/managers', (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM users WHERE role IN ('manager', 'admin') ORDER BY name COLLATE NOCASE`)
    .all() as UserRow[];
  res.json({ users: rows.map(toPublicUser) });
});

usersRouter.delete('/:id', requireRole('admin'), (req: AuthedRequest, res) => {
  const id = Number.parseInt(req.params.id ?? '', 10);
  if (!Number.isInteger(id) || id === req.user?.id) {
    res.status(400).json({ error: 'Please select a different user to remove' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.status(204).end();
});
