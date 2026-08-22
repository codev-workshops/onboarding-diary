'use client';

import type { EntryPage } from '@/components/entries/list-chrome';
import { EntryWorkspace } from '@/components/entries/workspace';
import { NoteDialog } from '@/components/notes/note-dialog';
import { NoteList } from '@/components/notes/note-list';
import type { NoteDto } from '@/src/modules/notes/dto';

export function NoteWorkspace({
  actorId,
  canFilterByOwner,
  page,
  notes,
}: {
  actorId: string;
  canFilterByOwner: boolean;
  page: EntryPage;
  notes: NoteDto[];
}) {
  return (
    <EntryWorkspace<NoteDto>
      heading="Notes"
      countNoun={['note', 'notes']}
      createLabel="New note"
      basePath="/notes"
      endpoint="/api/v1/notes"
      searchPlaceholder="Title or content"
      canFilterByOwner={canFilterByOwner}
      confirmDelete={(note) => `Delete “${note.title}”?`}
      selects={[]}
      extraFilter={{ name: 'tag', label: 'Tag', placeholder: 'e.g. access' }}
      page={page}
      items={notes}
      renderList={(args) => <NoteList actorId={actorId} {...args} />}
      renderDialog={({ entry, onClose, onSaved }) => (
        <NoteDialog note={entry} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
