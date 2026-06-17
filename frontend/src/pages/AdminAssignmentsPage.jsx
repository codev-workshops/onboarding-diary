import { useState, useEffect } from 'react';
import { getAssignments, createAssignment, removeAssignment, getUsers } from '../api/adminApi';

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [recruits, setRecruits] = useState([]);
  const [form, setForm] = useState({ managerId: '', recruitId: '' });
  const [error, setError] = useState('');

  const loadData = () => {
    getAssignments().then(res => setAssignments(res.data)).catch(console.error);
    getUsers().then(res => {
      setManagers(res.data.filter(u => u.role === 'MANAGER'));
      setRecruits(res.data.filter(u => u.role === 'RECRUIT'));
    }).catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createAssignment({
        managerId: Number(form.managerId),
        recruitId: Number(form.recruitId)
      });
      setForm({ managerId: '', recruitId: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleRemove = async (id) => {
    if (window.confirm('Remove this assignment?')) {
      await removeAssignment(id);
      loadData();
    }
  };

  return (
    <div className="page">
      <h2>Manager-Recruit Assignments</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <h3>Create Assignment</h3>
        <form onSubmit={handleSubmit} className="form-row">
          <div className="form-group">
            <label>Manager</label>
            <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} required>
              <option value="">Select manager</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Recruit</label>
            <select value={form.recruitId} onChange={(e) => setForm({ ...form, recruitId: e.target.value })} required>
              <option value="">Select recruit</option>
              {recruits.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>Assign</button>
        </form>
      </div>

      <div className="table-container">
        <h3>Current Assignments</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Manager</th>
              <th>Recruit</th>
              <th>Assigned At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id}>
                <td>{a.manager?.name}</td>
                <td>{a.recruit?.name}</td>
                <td>{a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : ''}</td>
                <td className="actions">
                  <button className="btn btn-sm btn-delete" onClick={() => handleRemove(a.id)}>Remove</button>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr><td colSpan="4" className="empty">No assignments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
