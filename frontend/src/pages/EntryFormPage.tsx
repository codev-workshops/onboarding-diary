import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createEntry, getEntry, updateEntry } from '../api/entries';

export default function EntryFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isEdit && id) {
      getEntry(Number(id)).then((entry) => {
        setTitle(entry.title);
        setContent(entry.content);
        setIsPublic(entry.isPublic);
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isEdit && id) {
        await updateEntry(Number(id), { title, content, isPublic });
      } else {
        await createEntry({ title, content, isPublic });
      }
      navigate('/entries');
    } catch {
      setError('Failed to save entry');
    }
  };

  return (
    <div className="entry-form-page">
      <h1>{isEdit ? 'Edit Entry' : 'New Entry'}</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Write your diary entry..." value={content} onChange={(e) => setContent(e.target.value)} required rows={10} />
        <label className="checkbox-label">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Make this entry public
        </label>
        <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Create'}</button>
      </form>
    </div>
  );
}
