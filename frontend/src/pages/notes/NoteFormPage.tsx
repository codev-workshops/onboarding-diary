import { useParams } from 'react-router-dom';
import type { Note } from '../../api/entries';
import EntryFormShell from '../../components/EntryFormShell';
import Field from '../../components/Field';
import { today } from '../../dates';
import { useEntryForm } from '../../hooks/useEntryForm';

interface NoteForm {
  entryDate: string;
  title: string;
  content: string;
  tags: string;
}

export function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function NoteFormPage() {
  const { id } = useParams();
  const { form, setField, errors, ...state } = useEntryForm<NoteForm, Note>({
    resource: '/api/notes',
    listPath: '/notes',
    id,
    initial: { entryDate: today(), title: '', content: '', tags: '' },
    fromDto: (note) => ({ ...note, tags: note.tags.join(', ') }),
    toRequest: (form) => ({ ...form, tags: parseTags(form.tags) }),
  });

  return (
    <EntryFormShell
      title={id ? 'Edit note' : 'New note'}
      listPath="/notes"
      isEdit={Boolean(id)}
      loading={state.loading}
      saving={state.saving}
      formError={state.formError}
      onSubmit={state.submit}
      onDelete={state.remove}
    >
      <Field label="Date" htmlFor="entryDate" error={errors.entryDate} required>
        <input id="entryDate" type="date" max={today()} value={form.entryDate} onChange={(e) => setField('entryDate', e.target.value)} required />
      </Field>
      <Field label="Title" htmlFor="title" error={errors.title} required>
        <input id="title" maxLength={120} value={form.title} onChange={(e) => setField('title', e.target.value)} required />
      </Field>
      <Field label="Content" htmlFor="content" error={errors.content} required>
        <textarea id="content" maxLength={10000} rows={8} value={form.content} onChange={(e) => setField('content', e.target.value)} required />
      </Field>
      <Field label="Tags" htmlFor="tags" error={errors.tags} hint="Comma-separated, up to 10 (e.g. setup, vpn).">
        <input id="tags" value={form.tags} onChange={(e) => setField('tags', e.target.value)} />
      </Field>
    </EntryFormShell>
  );
}
