import { z } from 'zod';

import { type EntryKind, type IssueSeverity, type Role, type TaskStatus } from '../enums.js';
import { uuid } from '../primitives.js';

export const dashboardQuery = z.object({
  ownerId: uuid.optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuery>;

export type EntryCountsDto = {
  tasks: number;
  issues: number;
  feedback: number;
  notes: number;
};

export type TaskProgressDto = {
  byStatus: Record<TaskStatus, number>;
  completed: number;
  total: number;
  completionPercent: number;
};

export type OpenIssuesDto = {
  total: number;
  bySeverity: Record<IssueSeverity, number>;
};

export type ActivityItemDto = {
  kind: EntryKind;
  id: string;
  entryDate: string;
  title: string;
  createdAt: string;
};

export type DashboardDto = {
  ownerId: string;
  counts: EntryCountsDto;
  taskProgress: TaskProgressDto;
  openIssues: OpenIssuesDto;
  recentActivity: ActivityItemDto[];
  lastActivityDate: string | null;
};

export type AdminDashboardDto = {
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<Role, number>;
  };
  counts: EntryCountsDto;
  taskProgress: TaskProgressDto;
  openIssues: OpenIssuesDto;
};
