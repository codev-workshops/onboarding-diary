import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createNote, getNote, updateNote } from '../api/noteApi';
import { getTags } from '../api/tagApi';

export default function NoteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '', content: '', tagInput: ''
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getTags().then(res => setAvailableTags(res.data)).catch(console.error);
    if (isEdit) {
      getNote(id).then(res => {
        const n = res.data;
        setForm({
          date: n.date, title: n.title, content: n.content, tagInput: ''
        });
        setSelectedTags(n.tags ? n.tags.map(t => t.name) : []);
      }).catch(() => setError('Failed to load note'));
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addTag = () => {
    const tag = form.tagInput.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setForm({ ...form, tagInput: '' });
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        date: form.date, title: form.title,
        content: form.content, tagNames: selectedTags
      };
      if (isEdit) {
        await updateNote(id, data);
      } else {
        await createNote(data);
      }
      navigate('/notes');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save note');
    }
  };

  return (
    <div className="page">
      <h2>{isEdit ? 'Edit Note' : 'New Note'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-group">
          <label>Date</label>
          <input type="date" name="date" value={form.date} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Title</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Content</label>
          <textarea name="content" value={form.content} onChange={handleChange} required rows="6" />
        </div>
        <div className="form-group">
          <label>Tags</label>
          <div className="tag-input-container">
            <div className="selected-tags">
              {selectedTags.map(tag => (
                <span key={tag} className="tag-pill">
                  {tag}
                  <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>&times;</button>
                </span>
              ))}
            </div>
            <div className="tag-input-row">
              <input
                type="text"
                name="tagInput"
                value={form.tagInput}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Type tag and press Enter"
              />
              <button type="button" className="btn btn-sm" onClick={addTag}>Add</button>
            </div>
            {availableTags.length > 0 && (
              <div className="available-tags">
                {availableTags.filter(t => !selectedTags.includes(t.name)).map(tag => (
                  <button key={tag.id} type="button" className="tag-pill tag-clickable"
                          onClick={() => setSelectedTags([...selectedTags, tag.name])}>
                    + {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Create'}</button>
          <button type="button" className="btn" onClick={() => navigate('/notes')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
