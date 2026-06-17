import { useEffect, useState } from 'react';
import { MOODS } from '../moods';
import { getTags } from '../api/tagApi';

const emptyEntry = {
  title: '',
  content: '',
  mood: 'happy',
  entryDate: '',
  tags: '',
};

function DiaryEntryForm({ initialEntry, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyEntry);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    if (initialEntry) {
      setForm({
        title: initialEntry.title || '',
        content: initialEntry.content || '',
        mood: initialEntry.mood || 'happy',
        entryDate: initialEntry.entryDate || '',
        tags: (initialEntry.tags || []).map((t) => t.name).join(', '),
      });
    } else {
      setForm(emptyEntry);
    }
  }, [initialEntry]);

  useEffect(() => {
    getTags()
      .then((res) => setAvailableTags(res.data))
      .catch(() => setAvailableTags([]));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addTag = (name) => {
    const current = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!current.includes(name)) {
      current.push(name);
      setForm({ ...form, tags: current.join(', ') });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({
      title: form.title,
      content: form.content,
      mood: form.mood,
      entryDate: form.entryDate || null,
      tags,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card form">
      <h3>{initialEntry ? 'Edit Entry' : 'New Entry'}</h3>
      <label>
        Title
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Content
        <textarea
          name="content"
          rows="5"
          value={form.content}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Mood
        <select name="mood" value={form.mood} onChange={handleChange}>
          {MOODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Entry Date
        <input
          type="date"
          name="entryDate"
          value={form.entryDate}
          onChange={handleChange}
        />
      </label>
      <label>
        Tags (comma-separated)
        <input
          type="text"
          name="tags"
          value={form.tags}
          onChange={handleChange}
          placeholder="training, meeting"
        />
      </label>
      {availableTags.length > 0 && (
        <div className="tag-suggestions">
          {availableTags.map((t) => (
            <button
              type="button"
              key={t.id}
              className="pill pill-clickable"
              onClick={() => addTag(t.name)}
            >
              + {t.name}
            </button>
          ))}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        {onCancel && (
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default DiaryEntryForm;
