import type {
  CreateNoteBody,
  ListNotesQuery,
  NoteDto,
  PaginationMeta,
  UpdateNoteBody,
} from '@onboarding-diary/shared';

import { assertEntryAccess, type Caller } from '../../access/entryAccess.js';
import { entryDateFilter } from '../../lib/entryFilters.js';
import { NotFoundError } from '../../lib/errors.js';
import { buildMeta, ENTRY_ORDER_BY, toPrismaPage, type PageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { toNoteDto } from '../../serializers/entries.js';

const WITH_TAGS = { tags: { include: { tag: true } } };

function toDate(entryDate: string): Date {
  return new Date(`${entryDate}T00:00:00.000Z`);
}

/**
 * Upsert the `Tag` rows a note needs and rewrite its join rows, so tag names stay unique
 * across notes and stale links never linger (T-082).
 */
async function replaceTags(db: Db, noteId: string, tags: readonly string[]): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.noteTag.deleteMany({ where: { noteId } });
    for (const name of tags) {
      const tag = await tx.tag.upsert({
        where: { name },
        create: { name },
        update: {},
        select: { id: true },
      });
      await tx.noteTag.create({ data: { noteId, tagId: tag.id } });
    }
  });
}

async function loadNote(db: Db, id: string): Promise<NoteDto> {
  const note = await db.note.findUnique({ where: { id }, include: WITH_TAGS });
  if (note === null) throw new NotFoundError('Note not found');
  return toNoteDto(note);
}

export async function createNote(db: Db, caller: Caller, body: CreateNoteBody): Promise<NoteDto> {
  const note = await db.note.create({
    data: {
      ownerId: caller.id,
      entryDate: toDate(body.entryDate),
      title: body.title,
      content: body.content ?? null,
    },
    select: { id: true },
  });
  await replaceTags(db, note.id, body.tags);
  return loadNote(db, note.id);
}

export async function readNote(db: Db, caller: Caller, id: string): Promise<NoteDto> {
  const note = await db.note.findUnique({ where: { id }, include: WITH_TAGS });
  if (note === null) throw new NotFoundError('Note not found');
  await assertEntryAccess(db, caller, note.ownerId, 'read');
  return toNoteDto(note);
}

export async function updateNote(
  db: Db,
  caller: Caller,
  id: string,
  body: UpdateNoteBody,
): Promise<NoteDto> {
  const existing = await db.note.findUnique({ where: { id } });
  if (existing === null) throw new NotFoundError('Note not found');
  await assertEntryAccess(db, caller, existing.ownerId, 'write');

  await db.note.update({
    where: { id },
    data: {
      ...(body.entryDate === undefined ? {} : { entryDate: toDate(body.entryDate) }),
      ...(body.title === undefined ? {} : { title: body.title }),
      ...(body.content === undefined ? {} : { content: body.content }),
    },
  });
  if (body.tags !== undefined) await replaceTags(db, id, body.tags);
  return loadNote(db, id);
}

export async function deleteNote(db: Db, caller: Caller, id: string): Promise<void> {
  const existing = await db.note.findUnique({ where: { id } });
  if (existing === null) throw new NotFoundError('Note not found');
  await assertEntryAccess(db, caller, existing.ownerId, 'write');
  await db.note.delete({ where: { id } });
}

export async function listNotes(
  db: Db,
  caller: Caller,
  query: ListNotesQuery,
  page: PageParams,
): Promise<{ data: NoteDto[]; meta: PaginationMeta }> {
  const ownerId = await assertEntryAccess(db, caller, query.ownerId, 'read');
  const entryDate = entryDateFilter(query);
  const where = {
    ownerId,
    ...(entryDate === undefined ? {} : { entryDate }),
    // Repeating `tag` narrows the result: a note must carry every requested tag (FR-N4).
    ...(query.tag === undefined || query.tag.length === 0
      ? {}
      : { AND: query.tag.map((name) => ({ tags: { some: { tag: { name } } } })) }),
  };

  const [notes, total] = await Promise.all([
    db.note.findMany({ where, orderBy: ENTRY_ORDER_BY, include: WITH_TAGS, ...toPrismaPage(page) }),
    db.note.count({ where }),
  ]);
  return { data: notes.map(toNoteDto), meta: buildMeta(page, total) };
}
