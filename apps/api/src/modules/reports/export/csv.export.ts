import type {
  ReportGeneratedData,
  TaskReportEntry,
  IssueReportEntry,
  FeedbackReportEntry,
} from '@onboarding-diary/shared';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsv).join(',');
}

function buildTasksCsv(entries: TaskReportEntry[]): string {
  const header = toCsvRow(['ID', 'Title', 'Status', 'Priority', 'Due Date', 'Completed At', 'Created At', 'Tags']);
  const rows = entries.map((e) =>
    toCsvRow([e.id, e.title, e.status, e.priority, e.due_date, e.completed_at, e.created_at, e.tags.join('; ')]),
  );
  return [header, ...rows].join('\n');
}

function buildIssuesCsv(entries: IssueReportEntry[]): string {
  const header = toCsvRow(['ID', 'Title', 'Severity', 'Status', 'Resolution Note', 'Resolved At', 'Created At']);
  const rows = entries.map((e) =>
    toCsvRow([e.id, e.title, e.severity, e.status, e.resolution_note, e.resolved_at, e.created_at]),
  );
  return [header, ...rows].join('\n');
}

function buildFeedbackCsv(entries: FeedbackReportEntry[]): string {
  const header = toCsvRow(['ID', 'Title', 'Type', 'Rating', 'Author', 'Subject', 'Created At']);
  const rows = entries.map((e) =>
    toCsvRow([e.id, e.title, e.type, e.rating, e.author_name, e.subject_name, e.created_at]),
  );
  return [header, ...rows].join('\n');
}

export function generateCsv(data: ReportGeneratedData): Buffer {
  const sections: string[] = [];

  sections.push(`Report: ${data.recruit_name}`);
  sections.push(`Period: ${data.period_start} to ${data.period_end}`);
  sections.push(`Generated: ${data.generated_at}`);
  sections.push(`Type: ${data.content_type}`);
  sections.push('');

  if (data.tasks) {
    sections.push('=== TASKS ===');
    sections.push(`Total: ${data.tasks.total}, Completed: ${data.tasks.completed}, Completion Rate: ${data.tasks.completion_rate}%`);
    sections.push('');
    sections.push(buildTasksCsv(data.tasks.entries));
    sections.push('');
  }

  if (data.issues) {
    sections.push('=== ISSUES ===');
    sections.push(`Total: ${data.issues.total}, Open: ${data.issues.open}, Critical: ${data.issues.critical}`);
    if (data.issues.avg_resolution_hours !== null) {
      sections.push(`Avg Resolution Time: ${data.issues.avg_resolution_hours}h`);
    }
    sections.push('');
    sections.push(buildIssuesCsv(data.issues.entries));
    sections.push('');
  }

  if (data.feedback) {
    sections.push('=== FEEDBACK ===');
    sections.push(`Total: ${data.feedback.total}, Received: ${data.feedback.received}, Given: ${data.feedback.given}`);
    if (data.feedback.avg_rating !== null) {
      sections.push(`Avg Rating: ${data.feedback.avg_rating}`);
    }
    sections.push('');
    sections.push(buildFeedbackCsv(data.feedback.entries));
    sections.push('');
  }

  return Buffer.from(sections.join('\n'), 'utf-8');
}
