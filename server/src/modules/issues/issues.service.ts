import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import type { JwtPayload } from '../../auth/jwt.js';
import { accessibleOwnerIds, assertCanAccessOwner, ownerFilter } from '../../access/scope.js';
import { ApiError } from '../../http/errors.js';
import { ISSUE_SEVERITIES, ISSUE_STATUSES } from '../../domain/enums.js';

const isoDate = z.coerce.date();

export const issueCreateSchema = z.object({
  date: isoDate,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  severity: z.enum(ISSUE_SEVERITIES),
  status: z.enum(ISSUE_STATUSES),
  resolutionNotes: z.string().max(5000).optional().nullable(),
});

export const issueUpdateSchema = issueCreateSchema.partial();

export const issueFilterSchema = z.object({
  status: z.enum(ISSUE_STATUSES).optional(),
  severity: z.enum(ISSUE_SEVERITIES).optional(),
});

export type IssueCreateInput = z.infer<typeof issueCreateSchema>;
export type IssueUpdateInput = z.infer<typeof issueUpdateSchema>;
export type IssueFilter = z.infer<typeof issueFilterSchema>;

export async function listIssues(db: Db, actor: JwtPayload, filter: IssueFilter) {
  const ids = await accessibleOwnerIds(db, actor);
  return db.issue.findMany({
    where: {
      ...ownerFilter(ids),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.severity ? { severity: filter.severity } : {}),
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getIssue(db: Db, actor: JwtPayload, id: string) {
  const issue = await db.issue.findUnique({ where: { id } });
  if (!issue) throw ApiError.notFound('Issue not found');
  const ids = await accessibleOwnerIds(db, actor);
  assertCanAccessOwner(ids, issue.ownerId);
  return issue;
}

export async function createIssue(db: Db, actor: JwtPayload, input: IssueCreateInput) {
  return db.issue.create({ data: { ...input, ownerId: actor.sub } });
}

export async function updateIssue(db: Db, actor: JwtPayload, id: string, input: IssueUpdateInput) {
  await getIssue(db, actor, id);
  return db.issue.update({ where: { id }, data: input });
}

export async function deleteIssue(db: Db, actor: JwtPayload, id: string): Promise<void> {
  await getIssue(db, actor, id);
  await db.issue.delete({ where: { id } });
}
