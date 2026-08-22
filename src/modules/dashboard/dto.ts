import type { IssueDto } from '@/src/modules/issues/dto';

export type DashboardPeriod = { date_from: string; date_to: string; days: number };

/**
 * Counts are per period, computed from grouped queries over exactly the rows
 * the caller may read. `notes_total` is therefore 0 on a manager's view of a
 * recruit — not because the number is hidden after the fact, but because the
 * rows are not in the caller's result set to begin with.
 */
export type DashboardSummary = {
  tasks_total: number;
  tasks_done: number;
  tasks_cancelled: number;
  task_completion_pct: number;
  issues_total: number;
  issues_open: number;
  issues_critical_open: number;
  feedback_total: number;
  notes_total: number;
};

export type RecentEntry = {
  id: string;
  kind: 'TASK' | 'ISSUE' | 'FEEDBACK' | 'NOTE';
  title: string;
  entry_date: string;
  created_at: string;
  owner: { id: string; full_name: string };
};

export type UserDashboard = {
  user: { id: string; full_name: string; start_date: string; days_since_start: number };
  period: DashboardPeriod;
  summary: DashboardSummary;
  open_issues: IssueDto[];
  recent_entries: RecentEntry[];
  last_activity_at: string | null;
};

export type TeamMemberRollup = {
  user: {
    id: string;
    full_name: string;
    department: string | null;
    start_date: string;
    days_since_start: number;
    is_active: boolean;
  };
  summary: DashboardSummary;
  last_activity_at: string | null;
};

export type TeamDashboard = {
  period: DashboardPeriod;
  totals: DashboardSummary & { recruits: number };
  members: TeamMemberRollup[];
};

export type DepartmentRollup = {
  department: string;
  recruits: number;
  summary: DashboardSummary;
};

export type OrgDashboard = {
  period: DashboardPeriod;
  totals: DashboardSummary & { recruits: number; managers: number; admins: number };
  departments: DepartmentRollup[];
  unassigned_recruits: { id: string; full_name: string; start_date: string }[];
};
