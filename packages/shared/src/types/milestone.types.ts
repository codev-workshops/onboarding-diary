import type { ReportStatus, ReportType } from '../enums';

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
