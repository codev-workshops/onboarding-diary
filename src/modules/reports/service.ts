import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { recordAuditBestEffort } from '@/src/modules/audit/service';
import { notFound, reportTooLarge } from '@/src/modules/authz/errors';
import { AppError } from '@/src/shared/http/errors';
import { recordReportRunBestEffort } from '@/src/modules/reports/runs';
import { assertRole, resolveReportTargets, type ReportTargets } from '@/src/modules/authz/policy';
import type { Actor } from '@/src/modules/authz/scope';
import {
  feedbackRepository,
  issueRepository,
  noteRepository,
  taskRepository,
  withheldFeedbackCount,
} from '@/src/modules/entries/repositories';
import { completionPct } from '@/src/modules/dashboard/service';
import { getDepartment } from '@/src/modules/departments/service';
import type { FeedbackRow } from '@/src/modules/feedback/dto';
import type { IssueRow } from '@/src/modules/issues/dto';
import type { NoteRow } from '@/src/modules/notes/dto';
import type { TaskRow } from '@/src/modules/tasks/dto';
import {
  CONFIDENTIALITY_NOTICE,
  SECTION_LABELS,
  type ReportModel,
  type ReportSectionKey,
  type ReportSectionModel,
  type ReportSummary,
  type ReportTotals,
  type ReportUserSummary,
} from '@/src/modules/reports/model';
import {
  MAX_SECTION_ROWS,
  expandSections,
  type ReportFilters,
  type ReportRequestInput,
} from '@/src/modules/reports/schemas';
import { listDepartmentUserIds, listUsersByIds, listVisibleUsers } from '@/src/modules/users/service';
import type { UserSummary } from '@/src/modules/users/dto';

/**
 * Report generation.
 *
 * Every row in a report comes out of the same scoped repositories the list
 * endpoints use, with the requested users added as an extra `AND` predicate —
 * an intersection with `readable_user_ids(actor)`, never a replacement for it.
 * A caller who names somebody they may not read has already been refused by
 * `resolveReportTargets` before any query runs, so this module never has to
 * decide what to leave out (§17.3, AZ-M6).
 */

const ISO_DATE = (value: Date): string => value.toISOString().slice(0, 10);
const ISO_TIME = (value: Date | null): string | null => (value ? value.toISOString() : null);

const ORDER_BY: Record<string, 'asc' | 'desc'>[] = [
  { entryDate: 'asc' },
  { createdAt: 'asc' },
  { id: 'asc' },
];

type Range = { from: Date; to: Date };

const inRange = (range: Range) => ({ entryDate: { gte: range.from, lte: range.to } });

/** `{ownerId: {in: []}}` for an empty target set: nobody, rather than everybody. */
const ownerPredicate = (ownerIds: string[] | null) =>
  ownerIds === null ? [] : [{ ownerId: { in: ownerIds } }];

/** The actor plus the name that goes in the report header (§18.1). */
export type ReportActor = Actor & { full_name: string };

/**
 * Times the generation and records a `ReportRun` either way (§21.1). A denial
 * is a row with `status=DENIED` and the error code, which is what makes an
 * out-of-scope attempt visible after the fact rather than only in the moment
 * (AZ-M6). Validation failures before this point have no parameters to record.
 */
export async function buildReport(actor: ReportActor, request: ReportRequestInput): Promise<ReportModel> {
  const startedAt = Date.now();

  try {
    const model = await assembleReport(actor, request);

    recordReportRunBestEffort({
      ...runParameters(actor, request),
      rowCount: model.sections.reduce((sum, section) => sum + section.row_count, 0),
      status: 'SUCCESS',
      errorCode: null,
      durationMs: Date.now() - startedAt,
    });

    return model;
  } catch (error) {
    const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
    const denied = error instanceof AppError && error.status === 403;

    recordReportRunBestEffort({
      ...runParameters(actor, request),
      rowCount: 0,
      status: denied ? 'DENIED' : 'FAILED',
      errorCode: code,
      durationMs: Date.now() - startedAt,
    });

    throw error;
  }
}

function runParameters(actor: ReportActor, request: ReportRequestInput) {
  return {
    requestedById: actor.id,
    scopeType: request.scope_type,
    // The ids as *requested*, not as resolved: the point of the row is what was
    // asked for, including the id that was refused.
    targetUserIds: request.user_ids ?? [],
    targetDepartmentId: request.department_id ?? null,
    dateFrom: request.date_from,
    dateTo: request.date_to,
    sections: [...request.sections],
    format: request.format,
  };
}

async function assembleReport(actor: ReportActor, request: ReportRequestInput): Promise<ReportModel> {
  const range: Range = { from: request.date_from, to: request.date_to };
  const canReadNotes = actor.role === 'ADMIN' || request.scope_type === 'SELF';
  const sections = expandSections(request.sections, canReadNotes);

  const { targets, description, slug } = await resolveScope(actor, request, sections);
  const ownerIds = targets.kind === 'ALL' ? null : targets.ids;

  const subjects =
    targets.kind === 'ALL' ? await listVisibleUsers(actor) : await listUsersByIds(actor, targets.ids);

  const rows = await readSections(actor, sections, ownerIds, range, request.filters);
  const withheld = sections.includes('FEEDBACK')
    ? await withheldFeedbackCount(
        actor,
        { from: range.from, to: range.to },
        { ownerIds },
        request.filters?.feedback?.type
      )
    : 0;

  const model: ReportModel = {
    report_id: randomUUID(),
    generated_at: new Date().toISOString(),
    generated_by: { id: actor.id, full_name: actor.full_name, role: actor.role },
    scope: {
      type: request.scope_type,
      description,
      subjects: subjects.map((subject) => ({
        id: subject.id,
        full_name: subject.full_name,
        role: subject.role,
        department: subject.department?.name ?? null,
        start_date: subject.start_date,
      })),
    },
    period: { date_from: ISO_DATE(range.from), date_to: ISO_DATE(range.to) },
    sections_included: sections.map(sectionKey),
    filters_applied: describeFilters(request.filters),
    summary: request.include_summary ? summarize(subjects, rows) : null,
    sections: request.include_details ? renderSections(sections, rows) : [],
    withheld: { feedback: withheld },
    confidentiality: CONFIDENTIALITY_NOTICE,
    filename_base: `onboarding-report_${slug}_${ISO_DATE(range.from)}_${ISO_DATE(range.to)}`,
  };

  auditGeneration(actor, request, model);
  return model;
}

/**
 * §22.1: every generation is recorded with the parameters it ran under, so a
 * later question about who exported whose diary has an answer. Denied attempts
 * are recorded too — as `AUTHZ.DENIED`, by the route envelope, because they
 * never reach this point. Best-effort: the audit row must not be able to fail
 * a report the caller was entitled to.
 */
function auditGeneration(actor: ReportActor, request: ReportRequestInput, model: ReportModel): void {
  recordAuditBestEffort({
    action: 'REPORT.GENERATED',
    entityType: 'REPORT',
    targetUserId: model.scope.subjects.length === 1 ? model.scope.subjects[0].id : null,
    after: {
      report_id: model.report_id,
      scope_type: request.scope_type,
      format: request.format,
      date_from: model.period.date_from,
      date_to: model.period.date_to,
      sections: model.sections_included.join(','),
      subject_count: model.scope.subjects.length,
      row_counts: model.sections.map((section) => `${section.key}=${section.row_count}`).join(','),
      withheld_feedback: model.withheld.feedback,
      filters: Object.entries(model.filters_applied)
        .map(([key, value]) => `${key}=${value}`)
        .join('; '),
    },
  });
}

async function resolveScope(
  actor: ReportActor,
  request: ReportRequestInput,
  sections: readonly ('TASKS' | 'ISSUES' | 'FEEDBACK' | 'NOTES')[]
): Promise<{ targets: ReportTargets; description: string; slug: string }> {
  let userIds = request.user_ids;
  let departmentName: string | null = null;

  if (request.scope_type === 'DEPARTMENT') {
    // Expanding a department is a directory read, so it is authorized as one
    // before the report scope is decided.
    assertRole(actor, ['ADMIN']);
    const department = request.department_id ? await getDepartment(request.department_id) : null;
    if (!department) throw notFound();

    departmentName = department.name;
    userIds = await listDepartmentUserIds(actor, department.id);
  }

  const targets = await resolveReportTargets(actor, {
    scopeType: request.scope_type,
    userIds,
    sections,
  });

  if (request.scope_type === 'DEPARTMENT' && departmentName) {
    return {
      targets,
      description: `Department: ${departmentName}`,
      slug: `dept-${slugify(departmentName)}`,
    };
  }

  if (request.scope_type === 'ORG') {
    return { targets, description: 'Whole organisation', slug: 'org' };
  }

  if (request.scope_type === 'SELF') {
    return { targets, description: actor.full_name, slug: slugify(actor.full_name) };
  }

  const count = targets.kind === 'ALL' ? 0 : targets.ids.length;
  return {
    targets,
    description: request.scope_type === 'USER' ? 'Single user' : `${count} selected users`,
    slug: request.scope_type === 'USER' ? 'user' : 'team',
  };
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug.length > 0 ? slug : 'report';
}

type SectionRows = {
  tasks: TaskRow[];
  issues: IssueRow[];
  feedback: FeedbackRow[];
  notes: NoteRow[];
};

const sectionKey = (section: 'TASKS' | 'ISSUES' | 'FEEDBACK' | 'NOTES'): ReportSectionKey =>
  section.toLowerCase() as ReportSectionKey;

/**
 * Reads each requested section, counting first. The count is the cap check
 * (§17.5): generation is synchronous, so a request that would materialise more
 * than `MAX_SECTION_ROWS` rows is refused rather than served slowly, and the
 * refusal happens before the rows are loaded into memory.
 */
async function readSections(
  actor: Actor,
  sections: readonly ('TASKS' | 'ISSUES' | 'FEEDBACK' | 'NOTES')[],
  ownerIds: string[] | null,
  range: Range,
  filters: ReportFilters | undefined
): Promise<SectionRows> {
  const rows: SectionRows = { tasks: [], issues: [], feedback: [], notes: [] };
  const owner = ownerPredicate(ownerIds);

  if (sections.includes('TASKS')) {
    const where: Prisma.TaskEntryWhereInput[] = [inRange(range), ...owner];
    const task = filters?.tasks;
    if (task?.status) where.push({ status: { in: task.status } });
    if (task?.category) where.push({ category: { in: task.category } });
    if (task?.priority) where.push({ priority: { in: task.priority } });

    await assertWithinCap('TASKS', taskRepository.count(actor, { filters: where }));
    rows.tasks = await taskRepository.list(actor, {
      filters: where,
      orderBy: ORDER_BY,
      take: MAX_SECTION_ROWS,
    });
  }

  if (sections.includes('ISSUES')) {
    const where: Prisma.IssueEntryWhereInput[] = [inRange(range), ...owner];
    const issue = filters?.issues;
    if (issue?.status) where.push({ status: { in: issue.status } });
    if (issue?.severity) where.push({ severity: { in: issue.severity } });

    await assertWithinCap('ISSUES', issueRepository.count(actor, { filters: where }));
    rows.issues = await issueRepository.list(actor, {
      filters: where,
      orderBy: ORDER_BY,
      take: MAX_SECTION_ROWS,
    });
  }

  if (sections.includes('FEEDBACK')) {
    const where: Prisma.FeedbackEntryWhereInput[] = [inRange(range), ...owner];
    if (filters?.feedback?.type) where.push({ type: { in: filters.feedback.type } });

    await assertWithinCap('FEEDBACK', feedbackRepository.count(actor, { filters: where }));
    rows.feedback = await feedbackRepository.list(actor, {
      filters: where,
      orderBy: ORDER_BY,
      take: MAX_SECTION_ROWS,
    });
  }

  if (sections.includes('NOTES')) {
    const where: Prisma.NoteEntryWhereInput[] = [inRange(range), ...owner];
    if (filters?.notes?.tags) where.push({ tags: { hasSome: filters.notes.tags } });

    await assertWithinCap('NOTES', noteRepository.count(actor, { filters: where }));
    rows.notes = await noteRepository.list(actor, {
      filters: where,
      orderBy: ORDER_BY,
      take: MAX_SECTION_ROWS,
    });
  }

  return rows;
}

async function assertWithinCap(section: string, counting: Promise<number>): Promise<void> {
  const total = await counting;
  if (total > MAX_SECTION_ROWS) throw reportTooLarge(section, total, MAX_SECTION_ROWS);
}

const EMPTY_USER_SUMMARY = {
  tasks_total: 0,
  tasks_done: 0,
  tasks_cancelled: 0,
  issues_total: 0,
  issues_open: 0,
  feedback_total: 0,
  notes_total: 0,
};

/**
 * Summaries are folded from the rows already read rather than from extra
 * grouped queries: the row cap bounds the work, and a summary computed from a
 * different query than the detail could disagree with it.
 */
function summarize(subjects: UserSummary[], rows: SectionRows): ReportSummary {
  const tally = new Map<string, typeof EMPTY_USER_SUMMARY & { full_name: string }>();
  const bucket = (ownerId: string, fullName: string) => {
    const found = tally.get(ownerId);
    if (found) return found;
    const created = { ...EMPTY_USER_SUMMARY, full_name: fullName };
    tally.set(ownerId, created);
    return created;
  };

  for (const subject of subjects) bucket(subject.id, subject.full_name);

  for (const row of rows.tasks) {
    const entry = bucket(row.ownerId, row.owner.fullName);
    entry.tasks_total += 1;
    if (row.status === 'DONE') entry.tasks_done += 1;
    if (row.status === 'CANCELLED') entry.tasks_cancelled += 1;
  }
  for (const row of rows.issues) {
    const entry = bucket(row.ownerId, row.owner.fullName);
    entry.issues_total += 1;
    if (row.status === 'OPEN' || row.status === 'IN_PROGRESS') entry.issues_open += 1;
  }
  for (const row of rows.feedback) bucket(row.ownerId, row.owner.fullName).feedback_total += 1;
  for (const row of rows.notes) bucket(row.ownerId, row.owner.fullName).notes_total += 1;

  const per_user: ReportUserSummary[] = [...tally]
    .map(([user_id, entry]) => ({
      user_id,
      full_name: entry.full_name,
      tasks_total: entry.tasks_total,
      tasks_done: entry.tasks_done,
      tasks_completion_pct: completionPct(entry.tasks_done, entry.tasks_total, entry.tasks_cancelled),
      issues_total: entry.issues_total,
      issues_open: entry.issues_open,
      feedback_total: entry.feedback_total,
      notes_total: entry.notes_total,
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name));

  const cancelled = [...tally.values()].reduce((sum, entry) => sum + entry.tasks_cancelled, 0);
  const totals: ReportTotals = {
    users: per_user.length,
    tasks_total: 0,
    tasks_done: 0,
    tasks_completion_pct: 0,
    issues_total: 0,
    issues_open: 0,
    feedback_total: 0,
    notes_total: 0,
  };

  for (const entry of per_user) {
    totals.tasks_total += entry.tasks_total;
    totals.tasks_done += entry.tasks_done;
    totals.issues_total += entry.issues_total;
    totals.issues_open += entry.issues_open;
    totals.feedback_total += entry.feedback_total;
    totals.notes_total += entry.notes_total;
  }

  totals.tasks_completion_pct = completionPct(totals.tasks_done, totals.tasks_total, cancelled);

  return { per_user, totals };
}

function renderSections(
  sections: readonly ('TASKS' | 'ISSUES' | 'FEEDBACK' | 'NOTES')[],
  rows: SectionRows
): ReportSectionModel[] {
  const rendered: ReportSectionModel[] = [];

  if (sections.includes('TASKS')) {
    rendered.push(
      section('tasks', TASK_COLUMNS, rows.tasks, (row) => ({
        user: row.owner.fullName,
        user_id: row.ownerId,
        entry_date: ISO_DATE(row.entryDate),
        title: row.title,
        description: row.description,
        category: row.category,
        status: row.status,
        priority: row.priority,
        completed_at: ISO_TIME(row.completedAt),
        updated_at: ISO_TIME(row.updatedAt),
      }))
    );
  }

  if (sections.includes('ISSUES')) {
    rendered.push(
      section('issues', ISSUE_COLUMNS, rows.issues, (row) => ({
        user: row.owner.fullName,
        user_id: row.ownerId,
        entry_date: ISO_DATE(row.entryDate),
        title: row.title,
        description: row.description,
        severity: row.severity,
        status: row.status,
        resolution_notes: row.resolutionNotes,
        resolved_at: ISO_TIME(row.resolvedAt),
        updated_at: ISO_TIME(row.updatedAt),
      }))
    );
  }

  if (sections.includes('FEEDBACK')) {
    rendered.push(
      section('feedback', FEEDBACK_COLUMNS, rows.feedback, (row) => ({
        user: row.owner.fullName,
        user_id: row.ownerId,
        entry_date: ISO_DATE(row.entryDate),
        subject: row.subject,
        type: row.type,
        details: row.details,
        visibility: row.visibility,
        updated_at: ISO_TIME(row.updatedAt),
      }))
    );
  }

  if (sections.includes('NOTES')) {
    rendered.push(
      section('notes', NOTE_COLUMNS, rows.notes, (row) => ({
        user: row.owner.fullName,
        user_id: row.ownerId,
        entry_date: ISO_DATE(row.entryDate),
        title: row.title,
        content: row.content,
        tags: row.tags.join(', '),
        updated_at: ISO_TIME(row.updatedAt),
      }))
    );
  }

  return rendered;
}

function section<Row>(
  key: ReportSectionKey,
  columns: { key: string; label: string }[],
  rows: Row[],
  toValues: (row: Row) => Record<string, string | number | null>
): ReportSectionModel {
  return {
    key,
    label: SECTION_LABELS[key],
    columns,
    row_count: rows.length,
    rows: rows.map(toValues),
  };
}

const COMMON_COLUMNS = [
  { key: 'user', label: 'User' },
  { key: 'user_id', label: 'User ID' },
  { key: 'entry_date', label: 'Date' },
];

const TASK_COLUMNS = [
  ...COMMON_COLUMNS,
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'completed_at', label: 'Completed at' },
  { key: 'updated_at', label: 'Updated at' },
];

const ISSUE_COLUMNS = [
  ...COMMON_COLUMNS,
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'severity', label: 'Severity' },
  { key: 'status', label: 'Status' },
  { key: 'resolution_notes', label: 'Resolution notes' },
  { key: 'resolved_at', label: 'Resolved at' },
  { key: 'updated_at', label: 'Updated at' },
];

const FEEDBACK_COLUMNS = [
  ...COMMON_COLUMNS,
  { key: 'subject', label: 'Subject' },
  { key: 'type', label: 'Type' },
  { key: 'details', label: 'Details' },
  { key: 'visibility', label: 'Visibility' },
  { key: 'updated_at', label: 'Updated at' },
];

const NOTE_COLUMNS = [
  ...COMMON_COLUMNS,
  { key: 'title', label: 'Title' },
  { key: 'content', label: 'Content' },
  { key: 'tags', label: 'Tags' },
  { key: 'updated_at', label: 'Updated at' },
];

function describeFilters(filters: ReportFilters | undefined): Record<string, string> {
  const applied: Record<string, string> = {};
  if (!filters) return applied;

  for (const [group, values] of Object.entries(filters)) {
    if (!values) continue;
    for (const [field, list] of Object.entries(values as Record<string, string[] | undefined>)) {
      if (list?.length) applied[`${group}.${field}`] = list.join(', ');
    }
  }

  return applied;
}
