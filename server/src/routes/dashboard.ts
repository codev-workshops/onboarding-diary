import { Router } from 'express';
import { db } from '../db.js';
import type { AuthedRequest } from '../lib/auth.js';
import { requireAuth, visibleUserIds } from '../lib/auth.js';
import { ENTITIES, TASK_STATUSES } from '../lib/entities.js';
import { countBy, listEntries } from '../lib/queries.js';
import type { EntityName } from '../lib/types.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

const toMap = (rows: Array<{ key: string | null; count: number }>): Record<string, number> =>
  Object.fromEntries(rows.map((row) => [row.key ?? 'Unknown', row.count]));

const ENTITY_NAMES: ReadonlyArray<EntityName> = ['tasks', 'issues', 'feedback', 'notes'];

dashboardRouter.get('/', (req: AuthedRequest, res) => {
  const actor = req.user;
  if (!actor) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const allowed = visibleUserIds(actor);
  const requested = typeof req.query.userId === 'string' ? Number(req.query.userId) : undefined;
  if (requested !== undefined && !allowed.includes(requested)) {
    res.status(403).json({ error: 'You do not have access to this dashboard' });
    return;
  }
  const userIds = requested === undefined ? allowed : [requested];

  const counts = Object.fromEntries(
    ENTITY_NAMES.map((name) => [
      name,
      countBy(name, userIds).reduce((sum, row) => sum + row.count, 0),
    ]),
  ) as Record<EntityName, number>;

  const tasksByStatus = toMap(countBy('tasks', userIds, 'status'));
  const issuesBySeverity = toMap(countBy('issues', userIds, 'severity'));
  const issuesByStatus = toMap(countBy('issues', userIds, 'status'));
  const feedbackByType = toMap(countBy('feedback', userIds, 'type'));

  const completed = tasksByStatus.Completed ?? 0;
  const completionRate = counts.tasks === 0 ? 0 : Math.round((completed / counts.tasks) * 100);
  const openIssues = (issuesByStatus.Open ?? 0) + (issuesByStatus['In progress'] ?? 0);

  const recent = Object.fromEntries(
    ENTITY_NAMES.map((name) => [name, listEntries(ENTITIES[name], { userIds, limit: 5 })]),
  );

  const placeholders = userIds.map(() => '?').join(', ');
  const activity =
    userIds.length === 0
      ? []
      : (db
          .prepare(
            `SELECT date, SUM(tasks) AS tasks, SUM(issues) AS issues FROM (
               SELECT date, COUNT(*) AS tasks, 0 AS issues FROM tasks
                 WHERE user_id IN (${placeholders}) GROUP BY date
               UNION ALL
               SELECT date, 0 AS tasks, COUNT(*) AS issues FROM issues
                 WHERE user_id IN (${placeholders}) GROUP BY date
             ) GROUP BY date ORDER BY date DESC LIMIT 14`,
          )
          .all(...userIds, ...userIds) as Array<{ date: string; tasks: number; issues: number }>);

  res.json({
    counts,
    tasksByStatus: Object.fromEntries(
      TASK_STATUSES.map((status) => [status, tasksByStatus[status] ?? 0]),
    ),
    issuesBySeverity,
    issuesByStatus,
    feedbackByType,
    completionRate,
    openIssues,
    recent,
    activity: [...activity].reverse(),
  });
});
