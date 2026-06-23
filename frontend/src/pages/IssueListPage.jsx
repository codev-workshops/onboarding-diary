import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIssues, deleteIssue } from '../api/issueApi';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';

export default function IssueListPage() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [filters, setFilters] = useState({});
  const navigate = useNavigate();
  const isRecruit = user?.role === 'RECRUIT';

  const loadIssues = () => {
    getIssues(filters).then(res => setIssues(res.data)).catch(console.error);
  };

  useEffect(() => { loadIssues(); }, [filters]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this issue?')) {
      await deleteIssue(id);
      loadIssues();
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value || undefined }));
  };

  const filterConfig = [
    { name: 'dateFrom', label: 'From', type: 'date' },
    { name: 'dateTo', label: 'To', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
    { name: 'severity', label: 'Severity', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Issues</h2>
        {isRecruit && <button className="btn btn-primary" onClick={() => navigate('/issues/new')}>New Issue</button>}
      </div>
      <FilterBar filters={filters} onFilterChange={handleFilterChange} filterConfig={filterConfig} />
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Severity</th>
              <th>Status</th>
              {isRecruit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {issues.map(issue => (
              <tr key={issue.id}>
                <td>{issue.date}</td>
                <td>{issue.title}</td>
                <td><StatusBadge value={issue.severity} /></td>
                <td><StatusBadge value={issue.status} /></td>
                {isRecruit && (
                  <td className="actions">
                    <button className="btn btn-sm btn-edit" onClick={() => navigate(`/issues/${issue.id}/edit`)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(issue.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {issues.length === 0 && (
              <tr><td colSpan="5" className="empty">No issues found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
