import type { Prisma } from '@prisma/client';
import type {
  NoteEntryDto,
  CreateNoteEntrySchema,
  UpdateNoteEntrySchema,
  NoteListParamsSchema,
  PaginatedResponse,
} from '@onboarding-diary/shared';
import { Role } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import { ForbiddenError, NotFoundError } from '../../errors/AppError.js';

function toNoteDto(note: {
  id: string;
  userId: string;
  title: string;
  body: string;
  moodRating: number | null;
  entryDate: Date;
  visibility: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): NoteEntryDto {
  return {
    id: note.id,
    user_id: note.userId,
    title: note.title,
    body: note.body,
    mood_rating: note.moodRating,
    entry_date: note.entryDate.toISOString(),
    visibility: note.visibility as NoteEntryDto['visibility'],
    tags: note.tags,
    created_at: note.createdAt.toISOString(),
    updated_at: note.updatedAt.toISOString(),
  };
}

const SORT_FIELD_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  entry_date: 'entryDate',
  title: 'title',
};

async function assertNoteAccess(
  note: { userId: string; visibility: string },
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  if (requesterRole === Role.ADMIN) return;
  if (note.userId === requesterId) return;

  if (note.visibility === 'PUBLIC') return;

  if (requesterRole === Role.MANAGER) {
    const assignment = await prisma.managerRecruitRelationship.findFirst({
      where: { managerId: requesterId, recruitId: note.userId, isActive: true },
    });
    if (assignment && note.visibility !== 'PRIVATE') return;
  }

  throw new ForbiddenError('You do not have permission to access this note');
}

export async function createNote(
  userId: string,
  input: CreateNoteEntrySchema,
): Promise<NoteEntryDto> {
  const note = await prisma.noteEntry.create({
    data: {
      userId,
      title: input.title,
      body: input.body,
      moodRating: input.mood_rating,
      entryDate: new Date(input.entry_date),
      visibility: input.visibility,
      tags: input.tags ?? [],
    },
  });

  return toNoteDto(note);
}

export async function updateNote(
  noteId: string,
  input: UpdateNoteEntrySchema,
  requesterId: string,
  requesterRole: Role,
): Promise<NoteEntryDto> {
  const note = await prisma.noteEntry.findUnique({
    where: { id: noteId, deletedAt: null },
  });

  if (!note) {
    throw new NotFoundError('Note');
  }

  if (note.userId !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('You can only edit your own notes');
  }

  const data: Prisma.NoteEntryUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.body !== undefined) data.body = input.body;
  if (input.mood_rating !== undefined) data.moodRating = input.mood_rating;
  if (input.visibility !== undefined) data.visibility = input.visibility;
  if (input.tags !== undefined) data.tags = input.tags;

  const updated = await prisma.noteEntry.update({
    where: { id: noteId },
    data,
  });

  return toNoteDto(updated);
}

export async function deleteNote(
  noteId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  const note = await prisma.noteEntry.findUnique({
    where: { id: noteId, deletedAt: null },
  });

  if (!note) {
    throw new NotFoundError('Note');
  }

  if (note.userId !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('You can only delete your own notes');
  }

  await prisma.noteEntry.update({
    where: { id: noteId },
    data: { deletedAt: new Date() },
  });
}

export async function getNoteById(
  noteId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<NoteEntryDto> {
  const note = await prisma.noteEntry.findUnique({
    where: { id: noteId, deletedAt: null },
  });

  if (!note) {
    throw new NotFoundError('Note');
  }

  await assertNoteAccess(note, requesterId, requesterRole);

  return toNoteDto(note);
}

export async function listNotes(
  query: NoteListParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<PaginatedResponse<NoteEntryDto>> {
  const { page, limit, sort_by, sort_order, visibility, from_date, to_date, tag, q } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.NoteEntryWhereInput = {
    deletedAt: null,
    ...(visibility ? { visibility } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(from_date || to_date
      ? {
          entryDate: {
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

  if (requesterRole === Role.RECRUIT) {
    const scopeFilter = {
      OR: [
        { userId: requesterId },
        { visibility: 'PUBLIC' as const },
      ],
    };
    if (q) {
      where.AND = [
        { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { body: { contains: q, mode: 'insensitive' as const } }] },
        scopeFilter,
      ];
      delete where.OR;
    } else {
      where.OR = scopeFilter.OR;
    }
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
        { visibility: 'PUBLIC' as const },
      ],
    };

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

  const orderBy: Prisma.NoteEntryOrderByWithRelationInput = {
    [SORT_FIELD_MAP[sort_by] ?? 'entryDate']: sort_order,
  };

  const [notes, totalCount] = await prisma.$transaction([
    prisma.noteEntry.findMany({ where, orderBy, skip, take: limit }),
    prisma.noteEntry.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: notes.map(toNoteDto),
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
