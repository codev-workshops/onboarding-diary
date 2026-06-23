import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createFeedback, getFeedbackById, updateFeedback } from '../api/feedbackApi';

export default function FeedbackFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: '', type: 'POSITIVE', details: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      getFeedbackById(id).then(res => {
        const f = res.data;
        setForm({
          date: f.date, subject: f.subject,
          type: f.type || 'POSITIVE', details: f.details
        });
      }).catch(() => setError('Failed to load feedback'));
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isEdit) {
        await updateFeedback(id, form);
      } else {
        await createFeedback(form);
      }
      navigate('/feedback');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save feedback');
    }
  };

  return (
    <div className="page">
      <h2>{isEdit ? 'Edit Feedback' : 'New Feedback'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-group">
          <label>Date</label>
          <input type="date" name="date" value={form.date} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Subject</label>
          <input type="text" name="subject" value={form.subject} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Type</label>
          <div className="radio-group">
            {['POSITIVE', 'SUGGESTION', 'CONCERN'].map(t => (
              <label key={t} className="radio-label">
                <input type="radio" name="type" value={t} checked={form.type === t} onChange={handleChange} />
                {t}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Details</label>
          <textarea name="details" value={form.details} onChange={handleChange} required rows="4" />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Create'}</button>
          <button type="button" className="btn" onClick={() => navigate('/feedback')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
