/**
 * Pure shaping helpers turning `GROUP BY` rows into the dashboard payload, so the counting
 * rules can be unit-tested without a database (T-090).
 */

import {
  ISSUE_SEVERITIES,
  OPEN_ISSUE_STATUSES,
  TASK_STATUSES,
  type IssueSeverity,
  type IssueStatus,
  type OpenIssuesDto,
  type TaskProgressDto,
  type TaskStatus,
} from '@onboarding-diary/shared';

export type CountRow<K extends string> = { key: K; count: number };

function zeroed<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

export function shapeTaskProgress(rows: readonly CountRow<TaskStatus>[]): TaskProgressDto {
  const byStatus = zeroed(TASK_STATUSES);
  for (const row of rows) byStatus[row.key] += row.count;
  const total = TASK_STATUSES.reduce((sum, status) => sum + byStatus[status], 0);
  const completed = byStatus.DONE;
  return {
    byStatus,
    completed,
    total,
    completionPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function shapeOpenIssues(
  rows: readonly (CountRow<IssueSeverity> & { status: IssueStatus })[],
): OpenIssuesDto {
  const bySeverity = zeroed(ISSUE_SEVERITIES);
  let total = 0;
  for (const row of rows) {
    if (!OPEN_ISSUE_STATUSES.includes(row.status)) continue;
    bySeverity[row.key] += row.count;
    total += row.count;
  }
  return { total, bySeverity };
}
