import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import type { JwtPayload } from '../../auth/jwt.js';
import { accessibleOwnerIds, assertCanAccessOwner, ownerFilter } from '../../access/scope.js';
import { ApiError } from '../../http/errors.js';

const isoDate = z.coerce.date();

export const noteCreateSchema = z.object({
  date: isoDate,
  title: z.string().min(1).max(200),
  content: z.string().max(20000).default(''),
  tags: z.array(z.string().min(1).max(50)).max(50).default([]),
});

export const noteUpdateSchema = noteCreateSchema.partial();

export const noteFilterSchema = z.object({
  tag: z.string().optional(),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
export type NoteFilter = z.infer<typeof noteFilterSchema>;

interface NoteRow {
  tags: string;
}

/** Tags are stored as a JSON string column; expose them as an array to callers. */
function serializeNote<T extends { tags?: string[] }>(input: T): Omit<T, 'tags'> & { tags?: string } {
  if (input.tags === undefined) return input as Omit<T, 'tags'> & { tags?: string };
  return { ...input, tags: JSON.stringify(input.tags) };
}

export function deserializeNote<T extends NoteRow>(row: T): Omit<T, 'tags'> & { tags: string[] } {
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.tags);
    if (Array.isArray(parsed)) tags = parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    tags = [];
  }
  return { ...row, tags };
}

export async function listNotes(db: Db, actor: JwtPayload, filter: NoteFilter) {
  const ids = await accessibleOwnerIds(db, actor);
  const rows = await db.note.findMany({
    where: {
      ...ownerFilter(ids),
      ...(filter.tag ? { tags: { contains: `"${filter.tag}"` } } : {}),
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(deserializeNote);
}

export async function getNote(db: Db, actor: JwtPayload, id: string) {
  const note = await db.note.findUnique({ where: { id } });
  if (!note) throw ApiError.notFound('Note not found');
  const ids = await accessibleOwnerIds(db, actor);
  assertCanAccessOwner(ids, note.ownerId);
  return deserializeNote(note);
}

export async function createNote(db: Db, actor: JwtPayload, input: NoteCreateInput) {
  const note = await db.note.create({
    data: {
      date: input.date,
      title: input.title,
      content: input.content,
      tags: JSON.stringify(input.tags),
      ownerId: actor.sub,
    },
  });
  return deserializeNote(note);
}

export async function updateNote(db: Db, actor: JwtPayload, id: string, input: NoteUpdateInput) {
  await getNote(db, actor, id);
  const note = await db.note.update({ where: { id }, data: serializeNote(input) });
  return deserializeNote(note);
}

export async function deleteNote(db: Db, actor: JwtPayload, id: string): Promise<void> {
  await getNote(db, actor, id);
  await db.note.delete({ where: { id } });
}
