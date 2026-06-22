import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEntries, deleteEntry } from '../api/entries';
import type { DiaryEntry } from '../types';

export default function EntriesPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEntries().then(setEntries).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      await deleteEntry(id);
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="entries-page">
      <div className="page-header">
        <h1>My Diary Entries</h1>
        <Link to="/entries/new" className="btn btn-primary">New Entry</Link>
      </div>
      {entries.length === 0 ? (
        <p>No entries yet. Create your first diary entry!</p>
      ) : (
        <div className="entries-list">
          {entries.map((entry) => (
            <div key={entry.id} className="entry-card">
              <h3><Link to={`/entries/${entry.id}`}>{entry.title}</Link></h3>
              <p>{entry.content.substring(0, 150)}{entry.content.length > 150 ? '...' : ''}</p>
              <div className="entry-meta">
                <span>{entry.isPublic ? 'Public' : 'Private'}</span>
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="entry-actions">
                <Link to={`/entries/${entry.id}`} className="btn btn-sm">View</Link>
                <Link to={`/entries/${entry.id}/edit`} className="btn btn-sm">Edit</Link>
                <button onClick={() => handleDelete(entry.id)} className="btn btn-sm btn-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
