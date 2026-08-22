import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import type { Actor } from '@/src/modules/authz/scope';
import { orderByWithTiebreak, skipFor, toPage, type Page } from '@/src/modules/entries/paging';
import { noteRepository } from '@/src/modules/entries/repositories';
import { toNoteDto, type NoteDto } from '@/src/modules/notes/dto';
import {
  createNoteSchema,
  sortColumn,
  updateNoteSchema,
  type ListNotesQuery,
} from '@/src/modules/notes/schemas';

function noteFilters(query: ListNotesQuery): Prisma.NoteEntryWhereInput[] {
  const filters: Prisma.NoteEntryWhereInput[] = [];

  if (query.date_from || query.date_to) {
    filters.push({
      entryDate: {
        ...(query.date_from && { gte: query.date_from }),
        ...(query.date_to && { lte: query.date_to }),
      },
    });
  }
  // Tags are stored lower-cased, so an exact `has` uses the GIN index rather
  // than degrading to a scan the way a case-insensitive match would.
  if (query.tag) filters.push({ tags: { has: query.tag } });
  if (query.q) {
    filters.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  return filters;
}

export async function listNotes(actor: Actor, query: ListNotesQuery): Promise<Page<NoteDto>> {
  const options = { ownerId: query.owner_id, filters: noteFilters(query) };

  const [rows, total] = await Promise.all([
    noteRepository.list(actor, {
      ...options,
      orderBy: orderByWithTiebreak(sortColumn(query.sort), query.order),
      skip: skipFor(query),
      take: query.page_size,
    }),
    noteRepository.count(actor, options),
  ]);

  return toPage(rows, total, query, toNoteDto);
}

export async function getNote(actor: Actor, id: string): Promise<NoteDto> {
  return toNoteDto(await noteRepository.findByIdOrThrow(actor, id));
}

export async function createNote(actor: Actor, body: z.infer<typeof createNoteSchema>): Promise<NoteDto> {
  const ownerId = body.owner_id ?? actor.id;

  const row = await noteRepository.create(actor, ownerId, {
    ownerId,
    entryDate: body.entry_date,
    title: body.title,
    content: body.content,
    tags: body.tags,
    updatedById: actor.id,
  });

  return toNoteDto(row);
}

export async function updateNote(
  actor: Actor,
  id: string,
  body: z.infer<typeof updateNoteSchema>
): Promise<NoteDto> {
  const { expected_version, ...fields } = body;

  const changes: Prisma.NoteEntryUncheckedUpdateInput = {
    ...(fields.entry_date !== undefined && { entryDate: fields.entry_date }),
    ...(fields.title !== undefined && { title: fields.title }),
    ...(fields.content !== undefined && { content: fields.content }),
    ...(fields.tags !== undefined && { tags: { set: fields.tags } }),
  };

  const row = await noteRepository.update(
    actor,
    id,
    changes,
    () => ({ ...changes, version: { increment: 1 }, updatedById: actor.id }),
    { expectedVersion: expected_version }
  );

  return toNoteDto(row);
}

export async function deleteNote(actor: Actor, id: string): Promise<void> {
  await noteRepository.softDelete(actor, id, (deletedAt) => ({ deletedAt, updatedById: actor.id }));
}
