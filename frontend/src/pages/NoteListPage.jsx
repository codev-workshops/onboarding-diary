import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotes, deleteNote } from '../api/noteApi';
import FilterBar from '../components/FilterBar';

export default function NoteListPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [filters, setFilters] = useState({});
  const navigate = useNavigate();
  const isRecruit = user?.role === 'RECRUIT';

  const loadNotes = () => {
    getNotes(filters).then(res => setNotes(res.data)).catch(console.error);
  };

  useEffect(() => { loadNotes(); }, [filters]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this note?')) {
      await deleteNote(id);
      loadNotes();
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value || undefined }));
  };

  const filterConfig = [
    { name: 'dateFrom', label: 'From', type: 'date' },
    { name: 'dateTo', label: 'To', type: 'date' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Notes</h2>
        {isRecruit && <button className="btn btn-primary" onClick={() => navigate('/notes/new')}>New Note</button>}
      </div>
      <FilterBar filters={filters} onFilterChange={handleFilterChange} filterConfig={filterConfig} />
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Tags</th>
              {isRecruit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {notes.map(note => (
              <tr key={note.id}>
                <td>{note.date}</td>
                <td>{note.title}</td>
                <td>
                  {note.tags && note.tags.map(tag => (
                    <span key={tag.id} className="tag-pill">{tag.name}</span>
                  ))}
                </td>
                {isRecruit && (
                  <td className="actions">
                    <button className="btn btn-sm btn-edit" onClick={() => navigate(`/notes/${note.id}/edit`)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(note.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {notes.length === 0 && (
              <tr><td colSpan="4" className="empty">No notes found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
