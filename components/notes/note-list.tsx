'use client';

import { formatDate } from '@/components/entries/labels';
import {
  EntryEmptyState,
  EntryPagination,
  EntryRowActions,
  type EntryPage,
} from '@/components/entries/list-chrome';
import { Badge } from '@/components/ui/badge';
import type { NoteDto } from '@/src/modules/notes/dto';

/**
 * Notes are private to their author (and admins), so every row here is the
 * viewer's own — the owner column other lists carry would say the same name
 * on every line.
 */
export function NoteList({
  actorId,
  busy,
  filtered,
  items,
  onCreate,
  onDelete,
  onEdit,
  page,
}: {
  actorId: string;
  busy: boolean;
  filtered: boolean;
  items: NoteDto[];
  onCreate: () => void;
  onDelete: (note: NoteDto) => void;
  onEdit: (note: NoteDto) => void;
  page: EntryPage;
}) {
  if (items.length === 0) {
    return (
      <EntryEmptyState
        filtered={filtered}
        emptyTitle="No notes yet"
        filteredTitle="No notes match those filters"
        emptyHint="Anything that does not fit a task or an issue belongs here."
        createLabel="Write your first note"
        onCreate={onCreate}
      />
    );
  }

  return (
    <div className={busy ? 'opacity-60 transition-opacity' : undefined} aria-busy={busy}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((note) => (
          <li key={note.id} className="bg-card flex flex-col gap-2 rounded-lg border p-4">
            <div>
              <p className="font-medium">{note.title}</p>
              <p className="text-muted-foreground text-sm">{formatDate(note.entry_date)}</p>
            </div>

            <p className="line-clamp-6 text-sm whitespace-pre-line">{note.content}</p>

            {note.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <li key={tag}>
                    <Badge variant="outline">{tag}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-auto">
              <EntryRowActions
                owned={note.owner.id === actorId}
                busy={busy}
                onEdit={() => onEdit(note)}
                onDelete={() => onDelete(note)}
              />
            </div>
          </li>
        ))}
      </ul>

      <EntryPagination basePath="/notes" page={page} />
    </div>
  );
}
