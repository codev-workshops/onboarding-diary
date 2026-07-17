import { stringify } from 'csv-stringify/sync';
import type { ReportData } from './reports.service.js';

const COLUMNS = [
  'Type',
  'Date',
  'Owner',
  'Title',
  'Detail',
  'Category',
  'Status',
  'Priority',
  'Severity',
  'ResolutionNotes',
  'FeedbackType',
  'Tags',
] as const;

type Row = Record<(typeof COLUMNS)[number], string>;

function blankRow(): Row {
  return {
    Type: '',
    Date: '',
    Owner: '',
    Title: '',
    Detail: '',
    Category: '',
    Status: '',
    Priority: '',
    Severity: '',
    ResolutionNotes: '',
    FeedbackType: '',
    Tags: '',
  };
}

/**
 * Serializes a report to a single normalized CSV (one row per entry, a `Type`
 * column distinguishing entry kinds). Mirrors the on-screen report
 * (docs/ASSUMPTIONS.md §11).
 */
export function csvFromReport(report: ReportData): string {
  const rows: Row[] = [];

  for (const t of report.tasks) {
    rows.push({
      ...blankRow(),
      Type: 'Task',
      Date: t.date,
      Owner: t.owner,
      Title: t.title,
      Detail: t.description,
      Category: t.category,
      Status: t.status,
      Priority: t.priority,
    });
  }
  for (const i of report.issues) {
    rows.push({
      ...blankRow(),
      Type: 'Issue',
      Date: i.date,
      Owner: i.owner,
      Title: i.title,
      Detail: i.description,
      Status: i.status,
      Severity: i.severity,
      ResolutionNotes: i.resolutionNotes,
    });
  }
  for (const f of report.feedback) {
    rows.push({
      ...blankRow(),
      Type: 'Feedback',
      Date: f.date,
      Owner: f.owner,
      Title: f.subject,
      Detail: f.details,
      FeedbackType: f.type,
    });
  }
  for (const n of report.notes) {
    rows.push({
      ...blankRow(),
      Type: 'Note',
      Date: n.date,
      Owner: n.owner,
      Title: n.title,
      Detail: n.content,
      Tags: n.tags,
    });
  }

  return stringify(rows, { header: true, columns: COLUMNS as unknown as string[] });
}
