import type { Prisma } from '@prisma/client';
import type {
  IssueEntryDto,
  CreateIssueEntrySchema,
  UpdateIssueEntrySchema,
  IssueListParamsSchema,
  PaginatedResponse,
} from '@onboarding-diary/shared';
import { Role } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import { ForbiddenError, NotFoundError } from '../../errors/AppError.js';

function toIssueDto(issue: {
  id: string;
  userId: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  visibility: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): IssueEntryDto {
  return {
    id: issue.id,
    user_id: issue.userId,
    title: issue.title,
    description: issue.description,
    severity: issue.severity as IssueEntryDto['severity'],
    status: issue.status as IssueEntryDto['status'],
    resolution_note: issue.resolutionNote,
    resolved_at: issue.resolvedAt?.toISOString() ?? null,
    visibility: issue.visibility as IssueEntryDto['visibility'],
    tags: issue.tags,
    created_at: issue.createdAt.toISOString(),
    updated_at: issue.updatedAt.toISOString(),
  };
}

const SORT_FIELD_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  severity: 'severity',
  status: 'status',
  title: 'title',
};

async function assertIssueAccess(
  issue: { userId: string; visibility: string },
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  if (requesterRole === Role.ADMIN) return;
  if (issue.userId === requesterId) return;

  if (requesterRole === Role.MANAGER) {
    const assignment = await prisma.managerRecruitRelationship.findFirst({
      where: { managerId: requesterId, recruitId: issue.userId, isActive: true },
    });
    if (assignment && issue.visibility !== 'PRIVATE') return;
  }

  throw new ForbiddenError('You do not have permission to access this issue');
}

export async function createIssue(
  userId: string,
  input: CreateIssueEntrySchema,
): Promise<IssueEntryDto> {
  const issue = await prisma.issueEntry.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      visibility: input.visibility,
      tags: input.tags ?? [],
    },
  });

  return toIssueDto(issue);
}

export async function updateIssue(
  issueId: string,
  input: UpdateIssueEntrySchema,
  requesterId: string,
  requesterRole: Role,
): Promise<IssueEntryDto> {
  const issue = await prisma.issueEntry.findUnique({
    where: { id: issueId, deletedAt: null },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  if (issue.userId !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('You can only edit your own issues');
  }

  const data: Prisma.IssueEntryUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.severity !== undefined) data.severity = input.severity;
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
      data.resolvedAt = data.resolvedAt ?? issue.resolvedAt ?? new Date();
    } else {
      data.resolvedAt = null;
    }
  }
  if (input.resolution_note !== undefined) data.resolutionNote = input.resolution_note;
  if (input.visibility !== undefined) data.visibility = input.visibility;
  if (input.tags !== undefined) data.tags = input.tags;

  const updated = await prisma.issueEntry.update({
    where: { id: issueId },
    data,
  });

  return toIssueDto(updated);
}

export async function deleteIssue(
  issueId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  const issue = await prisma.issueEntry.findUnique({
    where: { id: issueId, deletedAt: null },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  if (issue.userId !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('You can only delete your own issues');
  }

  await prisma.issueEntry.update({
    where: { id: issueId },
    data: { deletedAt: new Date() },
  });
}

export async function getIssueById(
  issueId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<IssueEntryDto> {
  const issue = await prisma.issueEntry.findUnique({
    where: { id: issueId, deletedAt: null },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  await assertIssueAccess(issue, requesterId, requesterRole);

  return toIssueDto(issue);
}

export async function listIssues(
  query: IssueListParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<PaginatedResponse<IssueEntryDto>> {
  const { page, limit, sort_by, sort_order, status, severity, visibility, from_date, to_date, tag, q } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.IssueEntryWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(severity ? { severity } : {}),
    ...(visibility ? { visibility } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(from_date || to_date
      ? {
          createdAt: {
            ...(from_date ? { gte: new Date(from_date) } : {}),
            ...(to_date ? { lte: new Date(to_date + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // Scope by role
  if (requesterRole === Role.RECRUIT) {
    where.userId = requesterId;
  } else if (requesterRole === Role.MANAGER) {
    const assignments = await prisma.managerRecruitRelationship.findMany({
      where: { managerId: requesterId, isActive: true },
      select: { recruitId: true },
    });
    const recruitIds = assignments.map((a) => a.recruitId);

    const scopeFilter = {
      OR: [
        { userId: requesterId },
        { userId: { in: recruitIds }, visibility: { not: 'PRIVATE' as const } },
      ],
    };

    if (q) {
      const textFilter = {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      };
      where.AND = [textFilter, scopeFilter];
      delete where.OR;
    } else {
      where.OR = scopeFilter.OR;
    }
  }

  const orderBy: Prisma.IssueEntryOrderByWithRelationInput = {
    [SORT_FIELD_MAP[sort_by] ?? 'createdAt']: sort_order,
  };

  const [issues, totalCount] = await prisma.$transaction([
    prisma.issueEntry.findMany({ where, orderBy, skip, take: limit }),
    prisma.issueEntry.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: issues.map(toIssueDto),
    meta: {
      page,
      limit,
      total_count: totalCount,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}
