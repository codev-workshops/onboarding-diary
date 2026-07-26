/**
 * The recruit dashboard body (T-160). Shared with the manager's read-only recruit view so
 * both show identical figures (FR-D1 to FR-D4).
 */

import {
  ENTRY_KINDS,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  type DashboardDto,
  type EntryKind,
} from '@onboarding-diary/shared';
import type { ReactNode } from 'react';

import { Badge } from '../../components/ui/Badge.js';
import { EmptyState } from '../../components/ui/states.js';
import { ProgressBar, StatTile } from './tiles.js';

const KIND_LABELS: Record<EntryKind, string> = {
  TASK: 'Task',
  ISSUE: 'Issue',
  FEEDBACK: 'Feedback',
  NOTE: 'Note',
};

export function DashboardView({ dashboard }: { dashboard: DashboardDto }): ReactNode {
  const { counts, taskProgress, openIssues, recentActivity } = dashboard;
  const totalEntries = counts.tasks + counts.issues + counts.feedback + counts.notes;

  if (totalEntries === 0) {
    return (
      <EmptyState
        title="Your diary is empty"
        description="Log a task, an issue, some feedback, or a note and this dashboard will fill in."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tasks" value={counts.tasks} />
        <StatTile label="Issues" value={counts.issues} />
        <StatTile label="Feedback" value={counts.feedback} />
        <StatTile label="Notes" value={counts.notes} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <ProgressBar
          label="Task completion"
          completed={taskProgress.completed}
          total={taskProgress.total}
          percent={taskProgress.completionPercent}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">
          Open issues <span className="text-slate-500">({openIssues.total})</span>
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {ISSUE_SEVERITIES.map((severity) => (
            <li key={severity} className="text-sm text-slate-700">
              <span className="font-medium">{ISSUE_SEVERITY_LABELS[severity]}:</span>{' '}
              {openIssues.bySeverity[severity]}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Nothing logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recentActivity.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 py-2 text-sm">
                <Badge tone={item.kind === 'ISSUE' ? 'warning' : 'info'}>
                  {KIND_LABELS[ENTRY_KINDS.find((kind) => kind === item.kind) ?? 'NOTE']}
                </Badge>
                <span className="flex-1 text-slate-900">{item.title}</span>
                <span className="text-slate-500">{item.entryDate}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
