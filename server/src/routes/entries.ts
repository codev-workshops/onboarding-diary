import { Router } from 'express';
import { db } from '../db.js';
import type { AuthedRequest } from '../lib/auth.js';
import { canWriteFor, requireAuth, visibleUserIds } from '../lib/auth.js';
import type { EntityDefinition } from '../lib/entities.js';
import { ENTITIES } from '../lib/entities.js';
import type { EntryRow, SqlParam } from '../lib/queries.js';
import { findEntry, listEntries } from '../lib/queries.js';
import type { EntityName } from '../lib/types.js';

const queryString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const collectFilters = (
  entity: EntityDefinition,
  query: Record<string, unknown>,
): Record<string, string> => {
  const filters: Record<string, string> = {};
  for (const column of entity.filterColumns) {
    const value = queryString(query[column]);
    if (value) {
      filters[column] = value;
    }
  }
  return filters;
};

const parseTargetUserId = (query: Record<string, unknown>, fallback: number): number => {
  const raw = queryString(query.userId);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(parsed) ? parsed : fallback;
};

export const createEntriesRouter = (name: EntityName): Router => {
  const entity = ENTITIES[name];
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: AuthedRequest, res) => {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const allowed = visibleUserIds(actor);
    const query = req.query as Record<string, unknown>;
    const requested = queryString(query.userId);
    let userIds = allowed;
    if (requested) {
      const target = parseTargetUserId(query, actor.id);
      if (!allowed.includes(target)) {
        res.status(403).json({ error: 'You do not have access to these entries' });
        return;
      }
      userIds = [target];
    }
    const entries = listEntries(entity, {
      userIds,
      from: queryString(query.from),
      to: queryString(query.to),
      filters: collectFilters(entity, query),
      search: queryString(query.q),
    });
    res.json({ entries });
  });

  router.post('/', (req: AuthedRequest, res) => {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const parsed = entity.schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check the form' });
      return;
    }
    const values = parsed.data as Record<string, string>;
    const params: SqlParam[] = [actor.id, ...entity.columns.map((column) => values[column] ?? '')];
    const placeholders = ['?', ...entity.columns.map(() => '?')].join(', ');
    const columnList = ['user_id', ...entity.columns.map((column) => `"${column}"`)].join(', ');
    const info = db
      .prepare(`INSERT INTO ${entity.table} (${columnList}) VALUES (${placeholders})`)
      .run(...params);
    res.status(201).json({ entry: findEntry(entity.table, Number(info.lastInsertRowid)) });
  });

  router.patch('/:id', (req: AuthedRequest, res) => {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = Number.parseInt(req.params.id ?? '', 10);
    const existing = Number.isInteger(id) ? findEntry(entity.table, id) : undefined;
    if (!existing) {
      res.status(404).json({ error: 'That entry no longer exists' });
      return;
    }
    if (!canWriteFor(actor, Number(existing.user_id))) {
      res.status(403).json({ error: 'You can only edit your own entries' });
      return;
    }
    const merged: EntryRow = { ...existing, ...(req.body as EntryRow) };
    const parsed = entity.schema.safeParse(merged);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check the form' });
      return;
    }
    const values = parsed.data as Record<string, string>;
    const assignments = entity.columns.map((column) => `"${column}" = ?`).join(', ');
    db.prepare(
      `UPDATE ${entity.table} SET ${assignments}, updated_at = datetime('now') WHERE id = ?`,
    ).run(...entity.columns.map((column) => values[column] ?? ''), id);
    res.json({ entry: findEntry(entity.table, id) });
  });

  router.delete('/:id', (req: AuthedRequest, res) => {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const id = Number.parseInt(req.params.id ?? '', 10);
    const existing = Number.isInteger(id) ? findEntry(entity.table, id) : undefined;
    if (!existing) {
      res.status(404).json({ error: 'That entry no longer exists' });
      return;
    }
    if (!canWriteFor(actor, Number(existing.user_id))) {
      res.status(403).json({ error: 'You can only delete your own entries' });
      return;
    }
    db.prepare(`DELETE FROM ${entity.table} WHERE id = ?`).run(id);
    res.status(204).end();
  });

  return router;
};
