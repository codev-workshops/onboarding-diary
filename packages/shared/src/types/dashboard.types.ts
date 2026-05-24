import type { TaskStatus } from '../enums';

// ── Recruit Dashboard ──────────────────────────────────────────

export interface TaskStatusCount {
  status: TaskStatus;
  count: number;
}

export interface RecruitDashboardDto {
  task_stats: {
    total: number;
    by_status: TaskStatusCount[];
    completion_rate: number;
    overdue: number;
  };
  issue_summary: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  recent_tasks: RecentEntryDto[];
  recent_issues: RecentEntryDto[];
  recent_notes: RecentEntryDto[];
  streak: {
    current_days: number;
    last_entry_date: string | null;
  };
}

export interface RecentEntryDto {
  id: string;
  title: string;
  type: 'task' | 'issue' | 'note';
  status?: string;
  created_at: string;
}

// ── Manager Dashboard ──────────────────────────────────────────

export interface RecruitSummaryDto {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  task_completion_rate: number;
  open_issues: number;
  total_entries_this_week: number;
  last_activity_at: string | null;
}

export interface ManagerDashboardDto {
  team_overview: {
    total_recruits: number;
    active_recruits: number;
    avg_task_completion_rate: number;
  };
  recruits: RecruitSummaryDto[];
  open_blockers: {
    total: number;
    critical: number;
    high: number;
    entries: RecentEntryDto[];
  };
  recent_activity: RecentEntryDto[];
}

// ── Admin Dashboard ────────────────────────────────────────────

export interface RoleCountDto {
  role: string;
  count: number;
}

export interface StatusCountDto {
  status: string;
  count: number;
}

export interface AdminDashboardDto {
  user_stats: {
    total: number;
    by_role: RoleCountDto[];
    by_status: StatusCountDto[];
    new_this_month: number;
  };
  system_metrics: {
    total_tasks: number;
    total_issues: number;
    total_notes: number;
    total_feedback: number;
    total_assignments: number;
  };
  issue_overview: {
    open: number;
    critical_open: number;
    avg_resolution_time_hours: number | null;
  };
  recent_signups: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    created_at: string;
  }[];
}
