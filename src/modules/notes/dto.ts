import type { Prisma } from '@prisma/client';

export const noteSelect = {
  id: true,
  ownerId: true,
  entryDate: true,
  title: true,
  content: true,
  tags: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, fullName: true } },
  updatedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.NoteEntrySelect;

export type NoteRow = Prisma.NoteEntryGetPayload<{ select: typeof noteSelect }>;

export type NoteDto = {
  id: string;
  owner: { id: string; full_name: string };
  entry_date: string;
  title: string;
  content: string;
  tags: string[];
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: { id: string; full_name: string };
};

export function toNoteDto(note: NoteRow): NoteDto {
  return {
    id: note.id,
    owner: { id: note.owner.id, full_name: note.owner.fullName },
    entry_date: note.entryDate.toISOString().slice(0, 10),
    title: note.title,
    content: note.content,
    tags: note.tags,
    version: note.version,
    created_at: note.createdAt.toISOString(),
    updated_at: note.updatedAt.toISOString(),
    updated_by: { id: note.updatedBy.id, full_name: note.updatedBy.fullName },
  };
}
