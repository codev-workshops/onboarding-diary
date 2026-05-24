import type { ExportFormat, ReportContentType, ReportStatus, ReportType } from '../enums';

export interface ReportDto {
  id: string;
  recruit_id: string;
  generated_by: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  summary: string | null;
  period_start: string;
  period_end: string;
  generated_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReportInput {
  recruit_id: string;
  type: ReportType;
  content_type: ReportContentType;
  title: string;
  summary?: string;
  period_start: string;
  period_end: string;
}

export interface UpdateReportInput {
  title?: string;
  summary?: string;
  status?: ReportStatus;
}

export interface ReportGeneratedData {
  content_type: ReportContentType;
  period_start: string;
  period_end: string;
  recruit_name: string;
  generated_at: string;
  tasks?: TaskReportData;
  issues?: IssueReportData;
  feedback?: FeedbackReportData;
}

export interface TaskReportData {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  blocked: number;
  completion_rate: number;
  overdue: number;
  entries: TaskReportEntry[];
}

export interface TaskReportEntry {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  tags: string[];
}

export interface IssueReportData {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  critical: number;
  high: number;
  avg_resolution_hours: number | null;
  entries: IssueReportEntry[];
}

export interface IssueReportEntry {
  id: string;
  title: string;
  severity: string;
  status: string;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface FeedbackReportData {
  total: number;
  received: number;
  given: number;
  avg_rating: number | null;
  by_type: { type: string; count: number }[];
  entries: FeedbackReportEntry[];
}

export interface FeedbackReportEntry {
  id: string;
  title: string;
  type: string;
  rating: number | null;
  author_name: string;
  subject_name: string;
  created_at: string;
}

export interface DownloadReportQuery {
  format: ExportFormat;
}
