import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateReport } from '../api/reportApi';
import { getRecruitsForManager, getUsers } from '../api/adminApi';

export default function ReportPage() {
  const { user } = useAuth();
  const [recruits, setRecruits] = useState([]);
  const [form, setForm] = useState({
    type: 'combined', format: 'pdf',
    dateFrom: '', dateTo: '', recruitId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'MANAGER') {
      getRecruitsForManager(user.id).then(res => {
        const list = res.data.map(a => ({ id: a.recruit.id, name: a.recruit.name }));
        setRecruits(list);
        if (list.length > 0) setForm(f => ({ ...f, recruitId: String(list[0].id) }));
      }).catch(console.error);
    } else if (user?.role === 'ADMIN') {
      getUsers().then(res => {
        const list = res.data.filter(u => u.role === 'RECRUIT').map(u => ({ id: u.id, name: u.name }));
        setRecruits(list);
        if (list.length > 0) setForm(f => ({ ...f, recruitId: String(list[0].id) }));
      }).catch(console.error);
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.dateFrom || !form.dateTo) {
      setError('Date range is required');
      return;
    }
    if (!form.recruitId) {
      setError('Please select a recruit');
      return;
    }
    setLoading(true);
    try {
      const response = await generateReport(form);
      const blob = new Blob([response.data], {
        type: form.format === 'pdf' ? 'application/pdf' : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${form.type}.${form.format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <h2>Generate Report</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-row">
          <div className="form-group">
            <label>Report Type</label>
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="tasks">Tasks Only</option>
              <option value="issues">Issues Only</option>
              <option value="feedback">Feedback Only</option>
              <option value="combined">Combined (All)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Format</label>
            <select name="format" value={form.format} onChange={handleChange}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date From</label>
            <input type="date" name="dateFrom" value={form.dateFrom} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Date To</label>
            <input type="date" name="dateTo" value={form.dateTo} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-group">
          <label>Recruit</label>
          <select name="recruitId" value={form.recruitId} onChange={handleChange} required>
            <option value="">Select recruit</option>
            {recruits.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Generating...' : 'Generate & Download'}
          </button>
        </div>
      </form>
    </div>
  );
}
