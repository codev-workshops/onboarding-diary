import { useState } from 'react';
import type { FormEvent } from 'react';
import { issuesApi } from '../api/entries';
import { ISSUE_SEVERITIES, ISSUE_STATUSES } from '../api/types';
import type { IssueRequest, IssueResponse } from '../api/types';
import EntryFormError from '../components/EntryFormError';
import { useEntries } from '../hooks/useEntries';

const today = () => new Date().toISOString().slice(0, 10);

const emptyIssue: IssueRequest = {
  date: today(),
  title: '',
  description: '',
  severity: 'Medium',
  status: 'Open',
  resolutionNotes: '',
};

export default function IssuesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const { entries, loading, error, save, remove } = useEntries<IssueRequest, IssueResponse>(issuesApi, {
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });

  const [form, setForm] = useState<IssueRequest>(emptyIssue);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const requiresResolution = form.status === 'Resolved' || form.status === 'Closed';

  function startEdit(issue: IssueResponse) {
    setEditingId(issue.id);
    setForm({
      date: issue.date,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      resolutionNotes: issue.resolutionNotes ?? '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyIssue, date: today() });
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
      <h1>Issue log</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit issue' : 'New issue'}</h2>

        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={form.date} required onChange={(e) => setForm({ ...form, date: e.target.value })} />

        <label htmlFor="title">Title</label>
        <input id="title" value={form.title} required maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={3}
          required
          maxLength={2000}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label htmlFor="severity">Severity</label>
        <select id="severity" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as IssueRequest['severity'] })}>
          {ISSUE_SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>

        <label htmlFor="status">Status</label>
        <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IssueRequest['status'] })}>
          {ISSUE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {requiresResolution && (
          <>
            <label htmlFor="resolutionNotes">Resolution notes</label>
            <textarea
              id="resolutionNotes"
              rows={2}
              required
              maxLength={2000}
              value={form.resolutionNotes ?? ''}
              onChange={(e) => setForm({ ...form, resolutionNotes: e.target.value })}
            />
          </>
        )}

        <EntryFormError error={formError} />

        <div className="form-actions">
          <button type="submit">{editingId ? 'Save changes' : 'Add issue'}</button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="filters">
        <label htmlFor="statusFilter">Status</label>
        <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          {ISSUE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <label htmlFor="severityFilter">Severity</label>
        <select id="severityFilter" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All</option>
          {ISSUE_SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>
      </div>

      <EntryFormError error={error} />
      {loading ? (
        <p className="muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted">No issues logged.</p>
      ) : (
        <table className="entry-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Severity</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.map((issue) => (
              <tr key={issue.id}>
                <td>{issue.date}</td>
                <td>{issue.title}</td>
                <td>
                  <span className={`badge severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span>
                </td>
                <td>{issue.status}</td>
                <td className="row-actions">
                  <button type="button" className="secondary" onClick={() => startEdit(issue)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => void remove(issue.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
