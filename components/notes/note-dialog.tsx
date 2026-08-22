'use client';

import {
  DialogField,
  EntryDialog,
  dialogId,
  textareaClass,
  useEntrySubmit,
  type SavedEntry,
} from '@/components/entries/form';
import { Input } from '@/components/ui/input';
import type { NoteDto } from '@/src/modules/notes/dto';

export function NoteDialog({
  note,
  onClose,
  onSaved,
}: {
  note?: NoteDto;
  onClose: () => void;
  onSaved: (saved: SavedEntry | null) => void;
}) {
  const { saving, message, fieldErrors, send } = useEntrySubmit('/api/v1/notes', note?.id, onSaved);

  function submit(form: FormData) {
    const tags = String(form.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    void send({
      entry_date: String(form.get('entry_date') ?? ''),
      title: String(form.get('title') ?? ''),
      content: String(form.get('content') ?? ''),
      tags,
      ...(note ? { expected_version: note.version } : {}),
    });
  }

  return (
    <EntryDialog
      title={note ? 'Edit note' : 'New note'}
      saveLabel="Save note"
      saving={saving}
      message={message}
      onClose={onClose}
      onSubmit={submit}
    >
      <DialogField name="entry_date" label="Date" errors={fieldErrors}>
        <Input
          id={dialogId('entry_date')}
          name="entry_date"
          type="date"
          required
          defaultValue={note?.entry_date ?? new Date().toISOString().slice(0, 10)}
        />
      </DialogField>

      <DialogField name="title" label="Title" errors={fieldErrors}>
        <Input
          id={dialogId('title')}
          name="title"
          required
          minLength={3}
          maxLength={140}
          defaultValue={note?.title}
        />
      </DialogField>

      <DialogField name="content" label="Content" errors={fieldErrors}>
        <textarea
          id={dialogId('content')}
          name="content"
          rows={8}
          required
          maxLength={20000}
          defaultValue={note?.content ?? ''}
          className={textareaClass}
        />
      </DialogField>

      <DialogField name="tags" label="Tags" errors={fieldErrors}>
        <Input
          id={dialogId('tags')}
          name="tags"
          defaultValue={note?.tags.join(', ')}
          placeholder="Comma separated, e.g. setup, access"
        />
      </DialogField>
    </EntryDialog>
  );
}
