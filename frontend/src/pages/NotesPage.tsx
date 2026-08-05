import { useState } from 'react';
import type { FormEvent } from 'react';
import { notesApi } from '../api/entries';
import type { NoteRequest, NoteResponse } from '../api/types';
import EntryFormError from '../components/EntryFormError';
import { useEntries } from '../hooks/useEntries';

const today = () => new Date().toISOString().slice(0, 10);

const emptyNote: NoteRequest = { date: today(), title: '', content: '', tags: [] };

export default function NotesPage() {
  const [search, setSearch] = useState('');
  const { entries, loading, error, save, remove } = useEntries<NoteRequest, NoteResponse>(notesApi, {
    search: search || undefined,
  });

  const [form, setForm] = useState<NoteRequest>(emptyNote);
  const [tagsText, setTagsText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function startEdit(note: NoteResponse) {
    setEditingId(note.id);
    setForm({ date: note.date, title: note.title, content: note.content, tags: note.tags });
    setTagsText(note.tags.join(', '));
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyNote, date: today() });
    setTagsText('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const tags = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    try {
      await save({ ...form, tags }, editingId ?? undefined);
      resetForm();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Save failed');
    }
  }

  return (
    <section>
      <h1>Notes</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit note' : 'New note'}</h2>

        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={form.date} required onChange={(e) => setForm({ ...form, date: e.target.value })} />

        <label htmlFor="title">Title</label>
        <input id="title" value={form.title} required maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          rows={4}
          required
          maxLength={5000}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />

        <label htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />

        <EntryFormError error={formError} />

        <div className="form-actions">
          <button type="submit">{editingId ? 'Save changes' : 'Add note'}</button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="filters">
        <label htmlFor="search">Search</label>
        <input id="search" value={search} placeholder="Title or content" onChange={(e) => setSearch(e.target.value)} />
      </div>

      <EntryFormError error={error} />
      {loading ? (
        <p className="muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted">No notes yet.</p>
      ) : (
        <ul className="entry-list">
          {entries.map((note) => (
            <li key={note.id} className="card">
              <h3>{note.title}</h3>
              <p className="muted">{note.date}</p>
              <p>{note.content}</p>
              <p>
                {note.tags.map((tag) => (
                  <span key={tag} className="badge">
                    {tag}
                  </span>
                ))}
              </p>
              <div className="row-actions">
                <button type="button" className="secondary" onClick={() => startEdit(note)}>
                  Edit
                </button>
                <button type="button" className="danger" onClick={() => void remove(note.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
