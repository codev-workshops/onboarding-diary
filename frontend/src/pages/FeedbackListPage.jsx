import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFeedback, deleteFeedback } from '../api/feedbackApi';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';

export default function FeedbackListPage() {
  const { user } = useAuth();
  const [feedbackList, setFeedbackList] = useState([]);
  const [filters, setFilters] = useState({});
  const navigate = useNavigate();
  const isRecruit = user?.role === 'RECRUIT';

  const loadFeedback = () => {
    getFeedback(filters).then(res => setFeedbackList(res.data)).catch(console.error);
  };

  useEffect(() => { loadFeedback(); }, [filters]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this feedback?')) {
      await deleteFeedback(id);
      loadFeedback();
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value || undefined }));
  };

  const filterConfig = [
    { name: 'dateFrom', label: 'From', type: 'date' },
    { name: 'dateTo', label: 'To', type: 'date' },
    { name: 'type', label: 'Type', type: 'select', options: ['POSITIVE', 'SUGGESTION', 'CONCERN'] },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Feedback</h2>
        {isRecruit && <button className="btn btn-primary" onClick={() => navigate('/feedback/new')}>New Feedback</button>}
      </div>
      <FilterBar filters={filters} onFilterChange={handleFilterChange} filterConfig={filterConfig} />
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Details</th>
              {isRecruit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {feedbackList.map(fb => (
              <tr key={fb.id}>
                <td>{fb.date}</td>
                <td>{fb.subject}</td>
                <td><StatusBadge value={fb.type} /></td>
                <td>{fb.details?.substring(0, 80)}{fb.details?.length > 80 ? '...' : ''}</td>
                {isRecruit && (
                  <td className="actions">
                    <button className="btn btn-sm btn-edit" onClick={() => navigate(`/feedback/${fb.id}/edit`)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(fb.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {feedbackList.length === 0 && (
              <tr><td colSpan="5" className="empty">No feedback found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
