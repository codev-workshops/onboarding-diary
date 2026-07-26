import type {
  AdminDashboardDto,
  DashboardDto,
  DirectReportSummaryDto,
  TaskProgressDto,
} from '@onboarding-diary/shared';

import { RECRUIT, userFixture } from './fakeClient.js';

function progress(completed: number, total: number): TaskProgressDto {
  return {
    byStatus: {
      NOT_STARTED: total - completed,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      DONE: completed,
    },
    completed,
    total,
    completionPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function dashboardFixture(overrides: Partial<DashboardDto> = {}): DashboardDto {
  return {
    ownerId: RECRUIT.id,
    counts: { tasks: 7, issues: 3, feedback: 2, notes: 4 },
    taskProgress: progress(5, 7),
    openIssues: { total: 2, bySeverity: { LOW: 0, MEDIUM: 1, HIGH: 1, CRITICAL: 0 } },
    recentActivity: [
      {
        kind: 'TASK',
        id: 'aaaaaaaa-0000-4000-8000-000000000001',
        title: 'Set up the laptop',
        entryDate: '2026-07-20',
        createdAt: '2026-07-20T09:00:00.000Z',
      },
    ],
    lastActivityDate: '2026-07-20',
    ...overrides,
  };
}

export const EMPTY_DASHBOARD = dashboardFixture({
  counts: { tasks: 0, issues: 0, feedback: 0, notes: 0 },
  taskProgress: progress(0, 0),
  openIssues: { total: 0, bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } },
  recentActivity: [],
  lastActivityDate: null,
});

export const DIRECT_REPORTS: DirectReportSummaryDto[] = [
  {
    user: userFixture({ id: RECRUIT.id, fullName: 'Nadia Khan', department: 'Engineering' }),
    taskProgress: progress(5, 10),
    openIssueCount: 2,
    lastActivityDate: '2026-07-20',
  },
  {
    user: userFixture({
      id: '44444444-4444-4444-8444-444444444444',
      fullName: 'Omar Haddad',
      department: 'Support',
    }),
    taskProgress: progress(0, 4),
    openIssueCount: 0,
    lastActivityDate: null,
  },
];

export const ADMIN_DASHBOARD: AdminDashboardDto = {
  users: { total: 9, active: 8, inactive: 1, byRole: { RECRUIT: 6, MANAGER: 2, ADMIN: 1 } },
  counts: { tasks: 40, issues: 12, feedback: 8, notes: 16 },
  taskProgress: progress(24, 40),
  openIssues: { total: 5, bySeverity: { LOW: 1, MEDIUM: 2, HIGH: 1, CRITICAL: 1 } },
};
