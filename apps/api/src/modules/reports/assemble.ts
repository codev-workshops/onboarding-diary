/** Fetch the entries a report covers, inclusive of both boundary dates (T-100). */

import type {
  CreateReportBody,
  FeedbackNoteDto,
  IssueEntryDto,
  NoteDto,
  ReportSection,
  TaskEntryDto,
  UserDto,
} from '@onboarding-diary/shared';

import { assertEntryAccess, type Caller } from '../../access/entryAccess.js';
import { entryDateFilter } from '../../lib/entryFilters.js';
import { NotFoundError } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { toFeedbackDto, toIssueDto, toNoteDto, toTaskDto } from '../../serializers/entries.js';
import { toUserDto } from '../../serializers/user.js';

export type ReportData = {
  owner: UserDto;
  from: string;
  to: string;
  sections: readonly ReportSection[];
  generatedAt: Date;
  tasks: TaskEntryDto[];
  issues: IssueEntryDto[];
  feedback: FeedbackNoteDto[];
  notes: NoteDto[];
};

export async function assembleReport(
  db: Db,
  caller: Caller,
  body: CreateReportBody,
  now: Date = new Date(),
): Promise<ReportData> {
  const ownerId = await assertEntryAccess(db, caller, body.ownerId, 'read');
  const owner = await db.user.findUnique({ where: { id: ownerId } });
  if (owner === null) throw new NotFoundError('User not found');

  const entryDate = entryDateFilter({ from: body.from, to: body.to });
  const where = { ownerId, ...(entryDate === undefined ? {} : { entryDate }) };
  const orderBy = [{ entryDate: 'asc' as const }, { createdAt: 'asc' as const }];
  const wanted = (section: ReportSection) => body.sections.includes(section);

  const [tasks, issues, feedback, notes] = await Promise.all([
    wanted('TASKS') ? db.taskEntry.findMany({ where, orderBy }) : [],
    wanted('ISSUES') ? db.issueEntry.findMany({ where, orderBy }) : [],
    wanted('FEEDBACK') ? db.feedbackNote.findMany({ where, orderBy }) : [],
    wanted('NOTES')
      ? db.note.findMany({ where, orderBy, include: { tags: { include: { tag: true } } } })
      : [],
  ]);

  return {
    owner: toUserDto(owner),
    from: body.from,
    to: body.to,
    sections: body.sections,
    generatedAt: now,
    tasks: tasks.map(toTaskDto),
    issues: issues.map(toIssueDto),
    feedback: feedback.map(toFeedbackDto),
    notes: notes.map(toNoteDto),
  };
}

export function reportSectionRows(data: ReportData, section: ReportSection): string[][] {
  switch (section) {
    case 'TASKS':
      return data.tasks.map((task) => [
        task.entryDate,
        task.title,
        task.category,
        task.status,
        task.priority,
        task.description ?? '',
      ]);
    case 'ISSUES':
      return data.issues.map((issue) => [
        issue.entryDate,
        issue.title,
        issue.severity,
        issue.status,
        issue.description ?? '',
        issue.resolutionNotes ?? '',
      ]);
    case 'FEEDBACK':
      return data.feedback.map((note) => [
        note.entryDate,
        note.subject,
        note.type,
        note.details ?? '',
      ]);
    case 'NOTES':
      return data.notes.map((note) => [
        note.entryDate,
        note.title,
        note.tags.join(' '),
        note.content ?? '',
      ]);
  }
}

export const REPORT_SECTION_HEADERS: Record<ReportSection, string[]> = {
  TASKS: ['Date', 'Title', 'Category', 'Status', 'Priority', 'Description'],
  ISSUES: ['Date', 'Title', 'Severity', 'Status', 'Description', 'Resolution notes'],
  FEEDBACK: ['Date', 'Subject', 'Type', 'Details'],
  NOTES: ['Date', 'Title', 'Tags', 'Content'],
};

export const EMPTY_SECTION_TEXT = 'No entries for this range';

export function reportSectionCounts(data: ReportData): { section: ReportSection; count: number }[] {
  return data.sections.map((section) => ({
    section,
    count: reportSectionRows(data, section).length,
  }));
}
