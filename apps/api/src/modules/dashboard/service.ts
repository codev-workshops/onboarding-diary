/** Dashboard aggregates (TRD 4.5). All counts are computed with SQL, never in memory. */

import {
  OPEN_ISSUE_STATUSES,
  type ActivityItemDto,
  type AdminDashboardDto,
  type DashboardDto,
  type EntryCountsDto,
  type EntryKind,
  type IssueSeverity,
  type Role,
  type TaskStatus,
} from '@onboarding-diary/shared';

import { assertEntryAccess, type Caller } from '../../access/entryAccess.js';
import type { Db } from '../../lib/prisma.js';
import { shapeOpenIssues, shapeTaskProgress } from './shape.js';

const RECENT_ACTIVITY_LIMIT = 5;

type ActivityRow = {
  kind: EntryKind;
  id: string;
  entryDate: Date;
  title: string;
  createdAt: Date;
};

async function entryCounts(db: Db, where: { ownerId?: string }): Promise<EntryCountsDto> {
  const [tasks, issues, feedback, notes] = await Promise.all([
    db.taskEntry.count({ where }),
    db.issueEntry.count({ where }),
    db.feedbackNote.count({ where }),
    db.note.count({ where }),
  ]);
  return { tasks, issues, feedback, notes };
}

async function taskProgress(db: Db, where: { ownerId?: string }) {
  const groups = await db.taskEntry.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });
  return shapeTaskProgress(
    groups.map((group) => ({ key: group.status as TaskStatus, count: group._count._all })),
  );
}

async function openIssues(db: Db, where: { ownerId?: string }) {
  const groups = await db.issueEntry.groupBy({
    by: ['severity', 'status'],
    where: { ...where, status: { in: [...OPEN_ISSUE_STATUSES] } },
    _count: { _all: true },
  });
  return shapeOpenIssues(
    groups.map((group) => ({
      key: group.severity as IssueSeverity,
      status: group.status,
      count: group._count._all,
    })),
  );
}

/** Newest five entries across all four tables, labelled with their kind (FR-D4). */
async function recentActivity(db: Db, ownerId: string): Promise<ActivityItemDto[]> {
  const rows = await db.$queryRaw<ActivityRow[]>`
    SELECT 'TASK' AS "kind", "id", "entryDate", "title", "createdAt"
      FROM "TaskEntry" WHERE "ownerId" = ${ownerId}::uuid
    UNION ALL
    SELECT 'ISSUE' AS "kind", "id", "entryDate", "title", "createdAt"
      FROM "IssueEntry" WHERE "ownerId" = ${ownerId}::uuid
    UNION ALL
    SELECT 'FEEDBACK' AS "kind", "id", "entryDate", "subject" AS "title", "createdAt"
      FROM "FeedbackNote" WHERE "ownerId" = ${ownerId}::uuid
    UNION ALL
    SELECT 'NOTE' AS "kind", "id", "entryDate", "title", "createdAt"
      FROM "Note" WHERE "ownerId" = ${ownerId}::uuid
    ORDER BY "entryDate" DESC, "createdAt" DESC
    LIMIT ${RECENT_ACTIVITY_LIMIT}
  `;
  return rows.map((row) => ({
    kind: row.kind,
    id: row.id,
    entryDate: row.entryDate.toISOString().slice(0, 10),
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getDashboard(
  db: Db,
  caller: Caller,
  requestedOwnerId: string | undefined,
): Promise<DashboardDto> {
  const ownerId = await assertEntryAccess(db, caller, requestedOwnerId, 'read');
  const where = { ownerId };
  const [counts, progress, issues, activity] = await Promise.all([
    entryCounts(db, where),
    taskProgress(db, where),
    openIssues(db, where),
    recentActivity(db, ownerId),
  ]);

  return {
    ownerId,
    counts,
    taskProgress: progress,
    openIssues: issues,
    recentActivity: activity,
    lastActivityDate: activity[0]?.entryDate ?? null,
  };
}

export async function getAdminDashboard(db: Db): Promise<AdminDashboardDto> {
  const [counts, progress, issues, roleGroups, total, active] = await Promise.all([
    entryCounts(db, {}),
    taskProgress(db, {}),
    openIssues(db, {}),
    db.user.groupBy({ by: ['role'], _count: { _all: true } }),
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
  ]);

  const byRole: Record<Role, number> = { RECRUIT: 0, MANAGER: 0, ADMIN: 0 };
  for (const group of roleGroups) byRole[group.role as Role] += group._count._all;

  return {
    users: { total, active, inactive: total - active, byRole },
    counts,
    taskProgress: progress,
    openIssues: issues,
  };
}
