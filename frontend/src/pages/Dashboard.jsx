import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboardApi';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="error">Failed to load dashboard</div>;

  return (
    <div className="dashboard">
      <h2>Welcome, {user?.name}</h2>

      {user?.role === 'RECRUIT' && (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/tasks')}>
              <h3>{data.totalTasks}</h3>
              <p>Total Tasks</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/tasks')}>
              <h3>{data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0}%</h3>
              <p>Task Completion</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/issues')}>
              <h3>{data.totalIssues}</h3>
              <p>Total Issues</p>
            </div>
            <div className="stat-card stat-warning stat-card-clickable" onClick={() => navigate('/issues')}>
              <h3>{data.openIssues}</h3>
              <p>Open Issues</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/feedback')}>
              <h3>{data.totalFeedback}</h3>
              <p>Feedback</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/notes')}>
              <h3>{data.totalNotes}</h3>
              <p>Notes</p>
            </div>
          </div>
          {data.recentEntries && data.recentEntries.length > 0 && (
            <div className="recent-entries">
              <h3>Recent Entries</h3>
              <div className="entries-list">
                {data.recentEntries.map((entry, idx) => (
                  <div key={idx} className="recent-entry-item">
                    <span className={`badge badge-${entry.type}`}>{entry.type}</span>
                    <span className="entry-title">{entry.title}</span>
                    <span className="entry-date">{entry.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {user?.role === 'MANAGER' && (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/reports')}>
              <h3>{data.totalTasks}</h3>
              <p>Total Tasks (All Recruits)</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/reports')}>
              <h3>{data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0}%</h3>
              <p>Overall Completion</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/reports')}>
              <h3>{data.totalIssues}</h3>
              <p>Total Issues</p>
            </div>
            <div className="stat-card stat-warning stat-card-clickable" onClick={() => navigate('/reports')}>
              <h3>{data.openIssues}</h3>
              <p>Open Issues</p>
            </div>
          </div>
          {data.recruitSummaries && data.recruitSummaries.length > 0 && (
            <div className="recruit-summaries">
              <h3>Assigned Recruits</h3>
              <div className="recruit-cards">
                {data.recruitSummaries.map((recruit) => (
                  <div key={recruit.recruitId} className="recruit-card"
                       onClick={() => navigate(`/recruits/${recruit.recruitId}`)}>
                    <h4>{recruit.recruitName}</h4>
                    <p className="recruit-dept">{recruit.department}</p>
                    <div className="recruit-stats">
                      <span>Tasks: {recruit.totalTasks}</span>
                      <span>Issues: {recruit.openIssues} open</span>
                      <span>Feedback: {recruit.totalFeedback}</span>
                      <span>Notes: {recruit.totalNotes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {user?.role === 'ADMIN' && (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/reports')}>
              <h3>{data.totalTasks}</h3>
              <p>Total Tasks</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/reports')}>
              <h3>{data.totalIssues}</h3>
              <p>Total Issues</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/reports')}>
              <h3>{data.totalFeedback}</h3>
              <p>Total Feedback</p>
            </div>
            <div className="stat-card stat-card-clickable" onClick={() => navigate('/reports')}>
              <h3>{data.totalNotes}</h3>
              <p>Total Notes</p>
            </div>
          </div>
          {data.userCountsByRole && (
            <div className="user-counts">
              <h3>Users by Role</h3>
              <div className="stats-grid">
                {Object.entries(data.userCountsByRole).map(([role, count]) => (
                  <div key={role} className="stat-card stat-card-clickable" onClick={() => navigate('/admin/users')}>
                    <h3>{count}</h3>
                    <p>{role}s</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="admin-actions">
            <button className="btn btn-primary" onClick={() => navigate('/admin/users')}>Manage Users</button>
            <button className="btn btn-primary" onClick={() => navigate('/admin/assignments')}>Manage Assignments</button>
            <button className="btn btn-primary" onClick={() => navigate('/reports')}>Generate Reports</button>
          </div>
        </div>
      )}
    </div>
  );
}
