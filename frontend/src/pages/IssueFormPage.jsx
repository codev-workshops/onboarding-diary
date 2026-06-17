import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createIssue, getIssue, updateIssue } from '../api/issueApi';

export default function IssueFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '', description: '', severity: 'MEDIUM',
    status: 'OPEN', resolutionNotes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      getIssue(id).then(res => {
        const i = res.data;
        setForm({
          date: i.date, title: i.title, description: i.description,
          severity: i.severity || 'MEDIUM', status: i.status || 'OPEN',
          resolutionNotes: i.resolutionNotes || ''
        });
      }).catch(() => setError('Failed to load issue'));
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
        await updateIssue(id, form);
      } else {
        await createIssue(form);
      }
      navigate('/issues');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save issue');
    }
  };

  const showResolution = form.status === 'RESOLVED' || form.status === 'CLOSED';

  return (
    <div className="page">
      <h2>{isEdit ? 'Edit Issue' : 'New Issue'}</h2>
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
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows="4" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Severity</label>
            <select name="severity" value={form.severity} onChange={handleChange}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
        {showResolution && (
          <div className="form-group">
            <label>Resolution Notes</label>
            <textarea name="resolutionNotes" value={form.resolutionNotes} onChange={handleChange} rows="3" />
          </div>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Create'}</button>
          <button type="button" className="btn" onClick={() => navigate('/issues')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
