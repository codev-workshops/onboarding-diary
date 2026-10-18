import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ISSUE_SEVERITIES, type IssueSeverity } from '../../api/entries';
import Alert from '../../components/Alert';
import { formatDate } from '../../dates';

interface TeamDashboard {
  recruitCount: number;
  openIssues: number;
  openBySeverity: Record<IssueSeverity, number>;
  recruits: {
    id: number;
    name: string;
    done: number;
    total: number;
    percent: number | null;
    openIssues: number;
    criticalIssues: number;
  }[];
  recentConcerns: { id: number; recruitId: number; recruitName: string; subject: string; entryDate: string }[];
}

/** Team overview (extension X3) with simple CSS bar charts (extension X2-lite). */
export default function TeamDashboardPage() {
  const [data, setData] = useState<TeamDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<TeamDashboard>('/api/team-dashboard').then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <Alert>{error}</Alert>;
  }
  if (!data) {
    return <p className="muted">Loading…</p>;
  }
  const maxSeverity = Math.max(1, ...Object.values(data.openBySeverity));
  const withCritical = data.recruits.filter((r) => r.criticalIssues > 0).length;

  return (
    <>
      <div className="page-header">
        <h1>Team dashboard</h1>
        <Link className="btn" to="/recruits">
          All recruits
        </Link>
      </div>
      <div className="stat-grid">
        <div className="card stat-card"><span className="stat-value">{data.recruitCount}</span><span className="stat-label">Active recruits</span></div>
        <div className="card stat-card"><span className="stat-value">{data.openIssues}</span><span className="stat-label">Open issues</span></div>
        <div className="card stat-card"><span className="stat-value">{withCritical}</span><span className="stat-label">With critical issues</span></div>
        <div className="card stat-card"><span className="stat-value">{data.recentConcerns.length}</span><span className="stat-label">Recent concerns</span></div>
      </div>
      <div className="grid-2 align-start">
        <section className="card">
          <h2>Task completion by recruit</h2>
          {data.recruits.length === 0 && <p className="muted">No active recruits assigned.</p>}
          <ul className="bar-chart">
            {data.recruits.map((r) => (
              <li key={r.id}>
                <Link to={`/recruits/${r.id}`} className="bar-label">{r.name}</Link>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${r.percent ?? 0}%` }} /></span>
                <span className="bar-value">{r.percent === null ? 'No tasks' : `${r.percent}%`}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Open issues by severity</h2>
          <ul className="bar-chart">
            {(Object.keys(data.openBySeverity) as IssueSeverity[]).map((severity) => (
              <li key={severity}>
                <span className="bar-label">{ISSUE_SEVERITIES[severity]}</span>
                <span className="bar-track">
                  <span className={`bar-fill bar-${severity.toLowerCase()}`} style={{ width: `${(data.openBySeverity[severity] * 100) / maxSeverity}%` }} />
                </span>
                <span className="bar-value">{data.openBySeverity[severity]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="card">
        <h2>Recent concerns</h2>
        {data.recentConcerns.length === 0 && <p className="muted">No concerns raised.</p>}
        <ul className="plain-list">
          {data.recentConcerns.map((c) => (
            <li key={c.id}>
              <Link to={`/recruits/${c.recruitId}?tab=feedback&type=CONCERN`}>{c.subject}</Link>
              <span className="muted"> · {c.recruitName} · {formatDate(c.entryDate)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
