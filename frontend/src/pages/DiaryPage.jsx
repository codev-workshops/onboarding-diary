import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRecruit } from '../api/recruitApi';
import {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
} from '../api/diaryEntryApi';
import DiaryEntryForm from '../components/DiaryEntryForm';
import { moodEmoji } from '../moods';

function DiaryPage() {
  const { id } = useParams();
  const [recruit, setRecruit] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const loadEntries = useCallback(() => {
    getEntries(id)
      .then((res) => setEntries(res.data))
      .catch(() => setError('Failed to load diary entries.'));
  }, [id]);

  useEffect(() => {
    getRecruit(id)
      .then((res) => setRecruit(res.data))
      .catch(() => setError('Failed to load recruit.'));
    loadEntries();
  }, [id, loadEntries]);

  const handleCreate = (data) => {
    createEntry(id, data)
      .then(() => {
        setShowForm(false);
        loadEntries();
      })
      .catch(() => setError('Failed to create entry.'));
  };

  const handleUpdate = (data) => {
    updateEntry(editing.id, data)
      .then(() => {
        setEditing(null);
        loadEntries();
      })
      .catch(() => setError('Failed to update entry.'));
  };

  const handleDelete = (entryId) => {
    if (!window.confirm('Delete this entry?')) return;
    deleteEntry(entryId)
      .then(loadEntries)
      .catch(() => setError('Failed to delete entry.'));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/" className="muted">
            &larr; Dashboard
          </Link>
          <h1>{recruit ? `${recruit.name}'s Diary` : 'Diary'}</h1>
        </div>
        <div className="header-actions">
          {recruit && (
            <Link to={`/recruits/${id}/milestones`} className="btn btn-sm">
              Milestones
            </Link>
          )}
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setShowForm((s) => !s);
            }}
          >
            {showForm ? 'Close' : 'New Entry'}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && !editing && (
        <DiaryEntryForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editing && (
        <DiaryEntryForm
          initialEntry={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {entries.length === 0 && <p>No diary entries yet.</p>}

      <div className="entry-list">
        {entries.map((entry) => (
          <div key={entry.id} className="card entry-card">
            <div className="entry-header">
              <h3>
                <span className="mood-emoji">{moodEmoji(entry.mood)}</span>{' '}
                {entry.title}
              </h3>
              <span className="muted">{entry.entryDate}</span>
            </div>
            {entry.mood && (
              <span className={`badge mood-${entry.mood}`}>{entry.mood}</span>
            )}
            <p className="entry-content">{entry.content}</p>
            <div className="tag-list">
              {(entry.tags || []).map((tag) => (
                <span key={tag.id} className="pill">
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="card-actions">
              <button
                className="btn btn-sm"
                onClick={() => {
                  setShowForm(false);
                  setEditing(entry);
                }}
              >
                Edit
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(entry.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DiaryPage;
