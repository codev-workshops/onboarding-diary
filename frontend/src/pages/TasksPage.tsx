import { useState } from 'react';
import type { FormEvent } from 'react';
import { tasksApi } from '../api/entries';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '../api/types';
import type { TaskRequest, TaskResponse } from '../api/types';
import EntryFormError from '../components/EntryFormError';
import { useEntries } from '../hooks/useEntries';

const today = () => new Date().toISOString().slice(0, 10);

const emptyTask: TaskRequest = {
  date: today(),
  title: '',
  description: '',
  category: 'Training',
  status: 'NotStarted',
  priority: 'Medium',
};

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { entries, loading, error, save, remove } = useEntries<TaskRequest, TaskResponse>(tasksApi, {
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  });

  const [form, setForm] = useState<TaskRequest>(emptyTask);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function startEdit(task: TaskResponse) {
    setEditingId(task.id);
    setForm({
      date: task.date,
      title: task.title,
      description: task.description ?? '',
      category: task.category,
      status: task.status,
      priority: task.priority,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyTask, date: today() });
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
      <h1>Task log</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit task' : 'New task'}</h2>

        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={form.date} required onChange={(e) => setForm({ ...form, date: e.target.value })} />

        <label htmlFor="title">Title</label>
        <input id="title" value={form.title} required maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={3}
          maxLength={2000}
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label htmlFor="category">Category</label>
        <select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TaskRequest['category'] })}>
          {TASK_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <label htmlFor="status">Status</label>
        <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskRequest['status'] })}>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <label htmlFor="priority">Priority</label>
        <select id="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskRequest['priority'] })}>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        <EntryFormError error={formError} />

        <div className="form-actions">
          <button type="submit">{editingId ? 'Save changes' : 'Add task'}</button>
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
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <label htmlFor="categoryFilter">Category</label>
        <select id="categoryFilter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All</option>
          {TASK_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <EntryFormError error={error} />
      {loading ? (
        <p className="muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted">No tasks yet.</p>
      ) : (
        <table className="entry-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.map((task) => (
              <tr key={task.id}>
                <td>{task.date}</td>
                <td>{task.title}</td>
                <td>{task.category}</td>
                <td>{task.status}</td>
                <td>{task.priority}</td>
                <td className="row-actions">
                  <button type="button" className="secondary" onClick={() => startEdit(task)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => void remove(task.id)}>
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
