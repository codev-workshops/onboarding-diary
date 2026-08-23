import type { UserRole } from '@prisma/client';

/**
 * The rendered report, independent of how it will be delivered.
 *
 * JSON preview, CSV and (M9) PDF all read this one structure, which is what
 * makes "the export shows what the preview showed" true by construction rather
 * than by three implementations agreeing. Columns travel with the rows so a
 * renderer never needs to know what a task is.
 */
export type ReportSectionKey = 'tasks' | 'issues' | 'feedback' | 'notes';

export type ReportCell = string | number | null;
export type ReportRowValues = Record<string, ReportCell>;

export type ReportColumn = { key: string; label: string };

export type ReportSectionModel = {
  key: ReportSectionKey;
  label: string;
  columns: ReportColumn[];
  row_count: number;
  rows: ReportRowValues[];
};

export type ReportSubject = {
  id: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  start_date: string;
};

export type ReportUserSummary = {
  user_id: string;
  full_name: string;
  tasks_total: number;
  tasks_done: number;
  tasks_completion_pct: number;
  issues_total: number;
  issues_open: number;
  feedback_total: number;
  notes_total: number;
};

export type ReportTotals = Omit<ReportUserSummary, 'user_id' | 'full_name'> & { users: number };

export type ReportSummary = { per_user: ReportUserSummary[]; totals: ReportTotals };

export type ReportModel = {
  report_id: string;
  generated_at: string;
  generated_by: { id: string; full_name: string; role: UserRole };
  scope: { type: string; description: string; subjects: ReportSubject[] };
  period: { date_from: string; date_to: string };
  sections_included: ReportSectionKey[];
  filters_applied: Record<string, string>;
  summary: ReportSummary | null;
  sections: ReportSectionModel[];
  /** Rows the caller's role is not allowed to see, counted but not shown. */
  withheld: { feedback: number };
  confidentiality: string;
  filename_base: string;
};

export const CONFIDENTIALITY_NOTICE =
  'Confidential — contains onboarding records. Share only with people entitled to see them.';

export const SECTION_LABELS: Record<ReportSectionKey, string> = {
  tasks: 'Tasks',
  issues: 'Issues',
  feedback: 'Feedback',
  notes: 'Notes',
};
