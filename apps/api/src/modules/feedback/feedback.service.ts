import type { Prisma } from '@prisma/client';
import type {
  FeedbackEntryDto,
  CreateFeedbackSchema,
  UpdateFeedbackSchema,
  FeedbackListParamsSchema,
  PaginatedResponse,
} from '@onboarding-diary/shared';
import { Role } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';

const userSelect = { id: true, firstName: true, lastName: true, role: true } as const;

function toFeedbackDto(entry: {
  id: string;
  authorId: string;
  subjectId: string;
  type: string;
  title: string;
  body: string;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
  author?: { id: string; firstName: string; lastName: string; role: string };
  subject?: { id: string; firstName: string; lastName: string; role: string };
}): FeedbackEntryDto {
  return {
    id: entry.id,
    author_id: entry.authorId,
    subject_id: entry.subjectId,
    type: entry.type as FeedbackEntryDto['type'],
    title: entry.title,
    body: entry.body,
    rating: entry.rating,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
    ...(entry.author
      ? {
          author: {
            id: entry.author.id,
            first_name: entry.author.firstName,
            last_name: entry.author.lastName,
            role: entry.author.role,
          },
        }
      : {}),
    ...(entry.subject
      ? {
          subject: {
            id: entry.subject.id,
            first_name: entry.subject.firstName,
            last_name: entry.subject.lastName,
            role: entry.subject.role,
          },
        }
      : {}),
  };
}

const SORT_FIELD_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  type: 'type',
  rating: 'rating',
  title: 'title',
};

export async function createFeedback(
  authorId: string,
  authorRole: Role,
  input: CreateFeedbackSchema,
): Promise<FeedbackEntryDto> {
  if (authorId === input.subject_id) {
    throw new BadRequestError('You cannot give feedback to yourself');
  }

  const subject = await prisma.user.findUnique({
    where: { id: input.subject_id, deletedAt: null },
  });

  if (!subject) {
    throw new NotFoundError('Subject user');
  }

  // Managers can give feedback to their assigned recruits
  // Recruits can give feedback to their managers
  // Admins can give feedback to anyone
  if (authorRole === Role.MANAGER) {
    const assignment = await prisma.managerRecruitRelationship.findFirst({
      where: { managerId: authorId, recruitId: input.subject_id, isActive: true },
    });
    if (!assignment) {
      throw new ForbiddenError('You can only give feedback to your assigned recruits');
    }
  } else if (authorRole === Role.RECRUIT) {
    const assignment = await prisma.managerRecruitRelationship.findFirst({
      where: { recruitId: authorId, managerId: input.subject_id, isActive: true },
    });
    if (!assignment) {
      throw new ForbiddenError('You can only give feedback to your assigned managers');
    }
  }

  const entry = await prisma.feedbackEntry.create({
    data: {
      authorId,
      subjectId: input.subject_id,
      type: input.type,
      title: input.title,
      body: input.body,
      rating: input.rating,
    },
    include: { author: { select: userSelect }, subject: { select: userSelect } },
  });

  return toFeedbackDto(entry);
}

export async function updateFeedback(
  feedbackId: string,
  input: UpdateFeedbackSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<FeedbackEntryDto> {
  const entry = await prisma.feedbackEntry.findUnique({
    where: { id: feedbackId, deletedAt: null },
    include: { author: { select: userSelect }, subject: { select: userSelect } },
  });

  if (!entry) {
    throw new NotFoundError('Feedback');
  }

  if (entry.authorId !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('You can only edit your own feedback');
  }

  const data: Prisma.FeedbackEntryUpdateInput = {};
  if (input.type !== undefined) data.type = input.type;
  if (input.title !== undefined) data.title = input.title;
  if (input.body !== undefined) data.body = input.body;
  if (input.rating !== undefined) data.rating = input.rating;

  const updated = await prisma.feedbackEntry.update({
    where: { id: feedbackId },
    data,
    include: { author: { select: userSelect }, subject: { select: userSelect } },
  });

  return toFeedbackDto(updated);
}

export async function deleteFeedback(
  feedbackId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  const entry = await prisma.feedbackEntry.findUnique({
    where: { id: feedbackId, deletedAt: null },
  });

  if (!entry) {
    throw new NotFoundError('Feedback');
  }

  if (entry.authorId !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('You can only delete your own feedback');
  }

  await prisma.feedbackEntry.update({
    where: { id: feedbackId },
    data: { deletedAt: new Date() },
  });
}

export async function getFeedbackById(
  feedbackId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<FeedbackEntryDto> {
  const entry = await prisma.feedbackEntry.findUnique({
    where: { id: feedbackId, deletedAt: null },
    include: { author: { select: userSelect }, subject: { select: userSelect } },
  });

  if (!entry) {
    throw new NotFoundError('Feedback');
  }

  // Author, subject, or ADMIN can view
  if (
    entry.authorId !== requesterId &&
    entry.subjectId !== requesterId &&
    requesterRole !== Role.ADMIN
  ) {
    throw new ForbiddenError('You do not have permission to view this feedback');
  }

  return toFeedbackDto(entry);
}

export async function listFeedback(
  query: FeedbackListParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<PaginatedResponse<FeedbackEntryDto>> {
  const { page, limit, sort_by, sort_order, type, subject_id, author_id, from_date, to_date, q } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.FeedbackEntryWhereInput = {
    deletedAt: null,
    ...(type ? { type } : {}),
    ...(subject_id ? { subjectId: subject_id } : {}),
    ...(author_id ? { authorId: author_id } : {}),
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
            { body: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // Scope by role: recruits/managers see only feedback they authored or about them
  if (requesterRole === Role.RECRUIT || requesterRole === Role.MANAGER) {
    const scopeFilter = { OR: [{ authorId: requesterId }, { subjectId: requesterId }] };
    if (q) {
      where.AND = [
        { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { body: { contains: q, mode: 'insensitive' as const } }] },
        scopeFilter,
      ];
      delete where.OR;
    } else {
      where.OR = scopeFilter.OR;
    }
  }

  const orderBy: Prisma.FeedbackEntryOrderByWithRelationInput = {
    [SORT_FIELD_MAP[sort_by] ?? 'createdAt']: sort_order,
  };

  const [entries, totalCount] = await prisma.$transaction([
    prisma.feedbackEntry.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { author: { select: userSelect }, subject: { select: userSelect } },
    }),
    prisma.feedbackEntry.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: entries.map(toFeedbackDto),
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
