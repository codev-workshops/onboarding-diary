import type {
  CreateIssueBody,
  IssueEntryDto,
  ListIssuesQuery,
  PaginationMeta,
  UpdateIssueBody,
} from '@onboarding-diary/shared';

import { assertEntryAccess, type Caller } from '../../access/entryAccess.js';
import { entryDateFilter, inFilter } from '../../lib/entryFilters.js';
import { NotFoundError } from '../../lib/errors.js';
import { buildMeta, ENTRY_ORDER_BY, toPrismaPage, type PageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { toIssueDto } from '../../serializers/entries.js';

function toDate(entryDate: string): Date {
  return new Date(`${entryDate}T00:00:00.000Z`);
}

export async function createIssue(
  db: Db,
  caller: Caller,
  body: CreateIssueBody,
): Promise<IssueEntryDto> {
  const issue = await db.issueEntry.create({
    data: {
      ownerId: caller.id,
      entryDate: toDate(body.entryDate),
      title: body.title,
      description: body.description ?? null,
      severity: body.severity,
      status: body.status,
      resolutionNotes: body.resolutionNotes ?? null,
    },
  });
  return toIssueDto(issue);
}

export async function readIssue(db: Db, caller: Caller, id: string): Promise<IssueEntryDto> {
  const issue = await db.issueEntry.findUnique({ where: { id } });
  if (issue === null) throw new NotFoundError('Issue not found');
  await assertEntryAccess(db, caller, issue.ownerId, 'read');
  return toIssueDto(issue);
}

export async function updateIssue(
  db: Db,
  caller: Caller,
  id: string,
  body: UpdateIssueBody,
): Promise<IssueEntryDto> {
  const existing = await db.issueEntry.findUnique({ where: { id } });
  if (existing === null) throw new NotFoundError('Issue not found');
  await assertEntryAccess(db, caller, existing.ownerId, 'write');

  const updated = await db.issueEntry.update({
    where: { id },
    data: {
      ...(body.entryDate === undefined ? {} : { entryDate: toDate(body.entryDate) }),
      ...(body.title === undefined ? {} : { title: body.title }),
      ...(body.description === undefined ? {} : { description: body.description }),
      ...(body.severity === undefined ? {} : { severity: body.severity }),
      ...(body.status === undefined ? {} : { status: body.status }),
      ...(body.resolutionNotes === undefined ? {} : { resolutionNotes: body.resolutionNotes }),
    },
  });
  return toIssueDto(updated);
}

export async function deleteIssue(db: Db, caller: Caller, id: string): Promise<void> {
  const existing = await db.issueEntry.findUnique({ where: { id } });
  if (existing === null) throw new NotFoundError('Issue not found');
  await assertEntryAccess(db, caller, existing.ownerId, 'write');
  await db.issueEntry.delete({ where: { id } });
}

export async function listIssues(
  db: Db,
  caller: Caller,
  query: ListIssuesQuery,
  page: PageParams,
): Promise<{ data: IssueEntryDto[]; meta: PaginationMeta }> {
  const ownerId = await assertEntryAccess(db, caller, query.ownerId, 'read');
  const entryDate = entryDateFilter(query);
  const severity = inFilter(query.severity);
  const status = inFilter(query.status);
  const where = {
    ownerId,
    ...(entryDate === undefined ? {} : { entryDate }),
    ...(severity === undefined ? {} : { severity }),
    ...(status === undefined ? {} : { status }),
  };

  const [issues, total] = await Promise.all([
    db.issueEntry.findMany({ where, orderBy: ENTRY_ORDER_BY, ...toPrismaPage(page) }),
    db.issueEntry.count({ where }),
  ]);
  return { data: issues.map(toIssueDto), meta: buildMeta(page, total) };
}
