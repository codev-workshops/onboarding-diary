import { useState } from 'react';
import type { FormEvent } from 'react';
import { feedbackApi } from '../api/entries';
import { FEEDBACK_TYPES } from '../api/types';
import type { FeedbackRequest, FeedbackResponse } from '../api/types';
import EntryFormError from '../components/EntryFormError';
import { useEntries } from '../hooks/useEntries';

const today = () => new Date().toISOString().slice(0, 10);

const emptyFeedback: FeedbackRequest = {
  date: today(),
  subject: '',
  type: 'Positive',
  details: '',
};

export default function FeedbackPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const { entries, loading, error, save, remove } = useEntries<FeedbackRequest, FeedbackResponse>(feedbackApi, {
    type: typeFilter || undefined,
  });

  const [form, setForm] = useState<FeedbackRequest>(emptyFeedback);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function startEdit(entry: FeedbackResponse) {
    setEditingId(entry.id);
    setForm({ date: entry.date, subject: entry.subject, type: entry.type, details: entry.details });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyFeedback, date: today() });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      await save(form, editingId ?? undefined);
      resetForm();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Save failed');
    }
  }

  return (
    <section>
      <h1>Feedback notes</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit feedback' : 'New feedback'}</h2>

        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={form.date} required onChange={(e) => setForm({ ...form, date: e.target.value })} />

        <label htmlFor="subject">Subject</label>
        <input id="subject" value={form.subject} required maxLength={200} onChange={(e) => setForm({ ...form, subject: e.target.value })} />

        <label htmlFor="type">Type</label>
        <select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FeedbackRequest['type'] })}>
          {FEEDBACK_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label htmlFor="details">Details</label>
        <textarea
          id="details"
          rows={3}
          required
          maxLength={2000}
          value={form.details}
          onChange={(e) => setForm({ ...form, details: e.target.value })}
        />

        <EntryFormError error={formError} />

        <div className="form-actions">
          <button type="submit">{editingId ? 'Save changes' : 'Add feedback'}</button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="filters">
        <label htmlFor="typeFilter">Type</label>
        <select id="typeFilter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All</option>
          {FEEDBACK_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <EntryFormError error={error} />
      {loading ? (
        <p className="muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted">No feedback recorded.</p>
      ) : (
        <ul className="entry-list">
          {entries.map((entry) => (
            <li key={entry.id} className="card">
              <h3>{entry.subject}</h3>
              <p className="muted">
                {entry.date} · {entry.type}
              </p>
              <p>{entry.details}</p>
              <div className="row-actions">
                <button type="button" className="secondary" onClick={() => startEdit(entry)}>
                  Edit
                </button>
                <button type="button" className="danger" onClick={() => void remove(entry.id)}>
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
