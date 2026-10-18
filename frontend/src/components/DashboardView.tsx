import { Link } from 'react-router-dom';
import {
  ENTRY_PATHS,
  ENTRY_TYPES,
  ISSUE_SEVERITIES,
  TASK_STATUSES,
  type Dashboard,
  type TaskStatus,
} from '../api/entries';
import { formatDate } from '../dates';
import Badge from './Badge';

interface Props {
  dashboard: Dashboard;
  /** Builds a link to an entry; omit for read-only views. */
  linkTo?: (path: string, id: number) => string;
}

/** Dashboard cards shared by the recruit's own view and the manager/admin view. */
export default function DashboardView({ dashboard, linkTo }: Props) {
  const { counts, taskProgress, openIssues, recent } = dashboard;
  const cards = [
    { label: 'Tasks', value: counts.tasks, path: 'tasks' },
    { label: 'Issues', value: counts.issues, path: 'issues' },
    { label: 'Feedback', value: counts.feedback, path: 'feedback' },
    { label: 'Notes', value: counts.notes, path: 'notes' },
  ];

  return (
    <div className="dashboard">
      <div className="stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="card stat-card">
            <span className="stat-value">{card.value}</span>
            <span className="stat-label">{card.label}</span>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="progress-heading">
          <h2 id="progress-heading">Task completion</h2>
          {taskProgress.percent === null ? (
            <p className="muted">No tasks yet.</p>
          ) : (
            <>
              <div
                className="progress"
                role="progressbar"
                aria-valuenow={taskProgress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="progress-fill" style={{ width: `${taskProgress.percent}%` }} />
              </div>
              <p>
                <strong>{taskProgress.percent}%</strong> done ({taskProgress.done} of{' '}
                {taskProgress.total})
              </p>
              <div className="badges">
                {(Object.keys(TASK_STATUSES) as TaskStatus[]).map((status) => (
                  <Badge
                    key={status}
                    value={status}
                    label={`${TASK_STATUSES[status]}: ${taskProgress.byStatus[status]}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="issues-heading">
          <h2 id="issues-heading">Open issues ({openIssues.count})</h2>
          {openIssues.top.length === 0 ? (
            <p className="muted">No open issues.</p>
          ) : (
            <ul className="plain-list">
              {openIssues.top.map((issue) => (
                <li key={issue.id}>
                  <Badge value={`severity-${issue.severity}`} label={ISSUE_SEVERITIES[issue.severity]} />{' '}
                  {linkTo ? <Link to={linkTo('issues', issue.id)}>{issue.title}</Link> : issue.title}
                  <span className="muted"> · {formatDate(issue.entryDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="recent-heading">
        <h2 id="recent-heading">Recent entries</h2>
        {recent.length === 0 ? (
          <p className="muted">Nothing logged yet.</p>
        ) : (
          <ul className="plain-list">
            {recent.map((entry) => (
              <li key={`${entry.type}-${entry.id}`}>
                <span className={`type-pill type-${entry.type.toLowerCase()}`}>
                  {ENTRY_TYPES[entry.type]}
                </span>{' '}
                {linkTo ? (
                  <Link to={linkTo(ENTRY_PATHS[entry.type], entry.id)}>{entry.title}</Link>
                ) : (
                  entry.title
                )}
                <span className="muted"> · {formatDate(entry.entryDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
