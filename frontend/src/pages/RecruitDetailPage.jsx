import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecruitTasks } from '../api/taskApi';
import { getRecruitIssues } from '../api/issueApi';
import { getRecruitFeedback } from '../api/feedbackApi';
import { getRecruitNotes } from '../api/noteApi';
import StatusBadge from '../components/StatusBadge';

export default function RecruitDetailPage() {
  const { recruitId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    getRecruitTasks(recruitId).then(res => setTasks(res.data)).catch(console.error);
    getRecruitIssues(recruitId).then(res => setIssues(res.data)).catch(console.error);
    getRecruitFeedback(recruitId).then(res => setFeedback(res.data)).catch(console.error);
    getRecruitNotes(recruitId).then(res => setNotes(res.data)).catch(console.error);
  }, [recruitId]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Recruit Details</h2>
        <button className="btn btn-primary"
                onClick={() => navigate(`/reports?recruitId=${recruitId}`)}>
          Generate Report
        </button>
      </div>

      <div className="tabs">
        {['tasks', 'issues', 'feedback', 'notes'].map(tab => (
          <button key={tab}
                  className={`tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({
              tab === 'tasks' ? tasks.length :
              tab === 'issues' ? issues.length :
              tab === 'feedback' ? feedback.length : notes.length
            })
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Title</th><th>Category</th><th>Status</th><th>Priority</th></tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td><td>{t.title}</td><td>{t.category}</td>
                  <td><StatusBadge value={t.status} /></td>
                  <td><StatusBadge value={t.priority} /></td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan="5" className="empty">No tasks</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Title</th><th>Severity</th><th>Status</th></tr>
            </thead>
            <tbody>
              {issues.map(i => (
                <tr key={i.id}>
                  <td>{i.date}</td><td>{i.title}</td>
                  <td><StatusBadge value={i.severity} /></td>
                  <td><StatusBadge value={i.status} /></td>
                </tr>
              ))}
              {issues.length === 0 && <tr><td colSpan="4" className="empty">No issues</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Subject</th><th>Type</th><th>Details</th></tr>
            </thead>
            <tbody>
              {feedback.map(f => (
                <tr key={f.id}>
                  <td>{f.date}</td><td>{f.subject}</td>
                  <td><StatusBadge value={f.type} /></td>
                  <td>{f.details?.substring(0, 80)}</td>
                </tr>
              ))}
              {feedback.length === 0 && <tr><td colSpan="4" className="empty">No feedback</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Title</th><th>Tags</th></tr>
            </thead>
            <tbody>
              {notes.map(n => (
                <tr key={n.id}>
                  <td>{n.date}</td><td>{n.title}</td>
                  <td>{n.tags?.map(t => <span key={t.id} className="tag-pill">{t.name}</span>)}</td>
                </tr>
              ))}
              {notes.length === 0 && <tr><td colSpan="3" className="empty">No notes</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
