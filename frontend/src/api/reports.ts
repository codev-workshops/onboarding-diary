import { apiDownload, apiRequest } from './client';
import type { Feedback, Issue, Note } from './diary';
import type { Task } from './tasks';

export type ReportSection = 'Tasks' | 'Issues' | 'Feedback' | 'Notes';

export type ReportFormat = 'Csv' | 'Pdf';

export const reportSections: ReportSection[] = ['Tasks', 'Issues', 'Feedback', 'Notes'];

export interface ReportHeader {
  userId: number;
  fullName: string;
  email: string;
  departmentName: string | null;
  startDate: string | null;
  from: string | null;
  to: string | null;
  generatedAt: string;
}

export interface ReportSummary {
  totalTasks: number;
  completedTasks: number;
  openIssues: number;
  resolvedIssues: number;
  feedbackCount: number;
  noteCount: number;
}

export interface Report {
  header: ReportHeader;
  summary: ReportSummary;
  sections: ReportSection[];
  tasks: Task[];
  issues: Issue[];
  feedback: Feedback[];
  notes: Note[];
}

export interface ReportFilters {
  userId?: number;
  from?: string;
  to?: string;
  sections?: ReportSection[];
}

/** Sections repeat as `sections=Tasks&sections=Notes`, matching the API's array binding. */
export function reportQueryString(filters: ReportFilters, format?: ReportFormat): string {
  const params = new URLSearchParams();

  if (format !== undefined) {
    params.set('format', format);
  }
  if (filters.userId !== undefined) {
    params.set('userId', String(filters.userId));
  }
  if (filters.from !== undefined && filters.from !== '') {
    params.set('from', filters.from);
  }
  if (filters.to !== undefined && filters.to !== '') {
    params.set('to', filters.to);
  }
  for (const section of filters.sections ?? []) {
    params.append('sections', section);
  }

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

export const previewReport = (filters: ReportFilters) =>
  apiRequest<Report>(`/reports/preview${reportQueryString(filters)}`);

export const downloadReport = (filters: ReportFilters, format: ReportFormat) =>
  apiDownload(
    `/reports/download${reportQueryString(filters, format)}`,
    `report.${format.toLowerCase()}`
  );
