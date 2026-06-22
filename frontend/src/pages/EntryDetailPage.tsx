import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEntry, deleteEntry } from '../api/entries';
import ShareDialog from '../components/ShareDialog';
import type { DiaryEntry } from '../types';

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      getEntry(Number(id)).then(setEntry).finally(() => setLoading(false));
    }
  }, [id]);

  const handleDelete = async () => {
    if (entry && confirm('Delete this entry?')) {
      await deleteEntry(entry.id);
      navigate('/entries');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!entry) return <p>Entry not found.</p>;

  return (
    <div className="entry-detail">
      <div className="page-header">
        <h1>{entry.title}</h1>
        <div className="entry-actions">
          <button onClick={() => setShowShareDialog(true)} className="btn btn-primary">Share</button>
          <Link to={`/entries/${entry.id}/edit`} className="btn">Edit</Link>
          <button onClick={handleDelete} className="btn btn-danger">Delete</button>
        </div>
      </div>
      <div className="entry-meta">
        <span>{entry.isPublic ? 'Public' : 'Private'}</span>
        <span>By {entry.authorUsername}</span>
        <span>{new Date(entry.createdAt).toLocaleString()}</span>
      </div>
      <div className="entry-content">{entry.content}</div>
      <Link to="/entries" className="btn">Back to Entries</Link>

      {showShareDialog && (
        <ShareDialog
          entryId={entry.id}
          entryTitle={entry.title}
          entryContent={entry.content}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  );
}
