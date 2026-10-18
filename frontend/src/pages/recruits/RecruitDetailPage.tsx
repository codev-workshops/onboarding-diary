import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import {
  FEEDBACK_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Dashboard,
  type Feedback,
  type Issue,
  type Note,
  type Task,
} from '../../api/entries';
import type { User } from '../../api/types';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import DashboardView from '../../components/DashboardView';
import RecruitChecklists from '../../components/RecruitChecklists';
import DateRangeFilter from '../../components/DateRangeFilter';
import OptionSelect from '../../components/OptionSelect';
import Pagination from '../../components/Pagination';
import { formatDate, formatDateTime } from '../../dates';
import { useFilters } from '../../hooks/useFilters';
import { usePaged } from '../../hooks/usePaged';

const TABS = { dashboard: 'Dashboard', tasks: 'Tasks', issues: 'Issues', feedback: 'Feedback', notes: 'Notes', checklists: 'Checklists' };
type Tab = keyof typeof TABS;

/** Read-only view of one recruit for their manager or an admin. */
export default function RecruitDetailPage() {
  const { id } = useParams();
  const filters = useFilters();
  const tab = (filters.get('tab') || 'dashboard') as Tab;
  const [recruit, setRecruit] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    setRecruit(null);
    setError('');
    api
      .get<User>(`/api/recruits/${id}`)
      .then((loaded) => current && setRecruit(loaded))
      .catch((err: unknown) => current && setError(err instanceof Error ? err.message : 'Could not load recruit'));
    return () => {
      current = false;
    };
  }, [id]);

  function selectTab(next: Tab) {
    filters.replaceAll(next === 'dashboard' ? {} : { tab: next });
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }
  if (!recruit) {
    return <p className="muted">Loading…</p>;
  }
  return (
    <>
      <div className="page-header">
        <div>
          <h1>{recruit.name}</h1>
          <p className="muted">
            {recruit.email} · {recruit.department ?? 'No department'} · Starts {formatDate(recruit.startDate)}
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" to={`/reports?recruitId=${recruit.id}`}>
            Generate report
          </Link>
        </div>
      </div>
      <nav className="tabs" aria-label="Recruit sections">
        {(Object.keys(TABS) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`tab${tab === key ? ' tab-active' : ''}`}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => selectTab(key)}
          >
            {TABS[key]}
          </button>
        ))}
      </nav>
      {tab === 'dashboard' && <RecruitDashboard key={recruit.id} id={recruit.id} />}
      {tab === 'checklists' && <RecruitChecklists key={recruit.id} recruitId={recruit.id} />}
      {tab !== 'dashboard' && tab !== 'checklists' && <EntryTab key={`${recruit.id}-${tab}`} id={recruit.id} tab={tab} />}
    </>
  );
}

function RecruitDashboard({ id }: { id: number }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  useEffect(() => {
    api.get<Dashboard>(`/api/recruits/${id}/dashboard`).then(setDashboard).catch(() => setDashboard(null));
  }, [id]);
  return dashboard ? <DashboardView dashboard={dashboard} /> : <p className="muted">Loading…</p>;
}

type AnyEntry = Task | Issue | Feedback | Note;

function EntryTab({ id, tab }: { id: number; tab: Exclude<Tab, 'dashboard' | 'checklists'> }) {
  const filters = useFilters();
  const query = new URLSearchParams(filters.params);
  query.delete('tab');
  const { data, loading, error } = usePaged<AnyEntry>(`/api/recruits/${id}/${tab}`, query);
  const select = (name: string, label: string, options: Record<string, string>) => (
    <label className="filter">
      <span>{label}</span>
      <OptionSelect options={options} emptyLabel="All" value={filters.get(name)} onChange={(v) => filters.setFilter(name, v)} />
    </label>
  );

  return (
    <>
      <div className="card filter-bar">
        <DateRangeFilter from={filters.get('from')} to={filters.get('to')} onChange={filters.setFilter} />
        {tab === 'tasks' && select('category', 'Category', TASK_CATEGORIES)}
        {tab === 'tasks' && select('status', 'Status', TASK_STATUSES)}
        {tab === 'issues' && select('status', 'Status', ISSUE_STATUSES)}
        {tab === 'issues' && select('severity', 'Severity', ISSUE_SEVERITIES)}
        {tab === 'feedback' && select('type', 'Type', FEEDBACK_TYPES)}
      </div>
      <Alert>{error}</Alert>
      {loading && !data && <p className="muted">Loading…</p>}
      {data && data.content.length === 0 && (
        <>
          <p className="empty-page">No entries.</p>
          <Pagination page={data} onChange={(page) => filters.setFilter('page', String(page))} />
        </>
      )}
      {data && data.content.length > 0 && (
        <>
          <ul className="entry-list">
            {data.content.map((entry) => (
              <li key={entry.id} className="card entry-item">
                <EntryItem tab={tab} entry={entry} />
              </li>
            ))}
          </ul>
          <Pagination page={data} onChange={(page) => filters.setFilter('page', String(page))} />
        </>
      )}
    </>
  );
}

function EntryItem({ tab, entry }: { tab: Exclude<Tab, 'dashboard' | 'checklists'>; entry: AnyEntry }) {
  const head = (title: string) => (
    <div className="entry-head">
      <span className="entry-title">{title}</span>
      <span className="muted">{formatDate(entry.entryDate)}</span>
    </div>
  );
  if (tab === 'tasks') {
    const task = entry as Task;
    return (
      <>
        {head(task.title)}
        <div className="badges">
          <Badge value={task.status} label={TASK_STATUSES[task.status]} />
          <Badge value={`priority-${task.priority}`} label={`${TASK_PRIORITIES[task.priority]} priority`} />
          <span className="tag">{TASK_CATEGORIES[task.category]}</span>
        </div>
        {task.description && <p className="entry-body">{task.description}</p>}
      </>
    );
  }
  if (tab === 'issues') {
    const issue = entry as Issue;
    return (
      <>
        {head(issue.title)}
        <div className="badges">
          <Badge value={`severity-${issue.severity}`} label={ISSUE_SEVERITIES[issue.severity]} />
          <Badge value={issue.status} label={ISSUE_STATUSES[issue.status]} />
          {issue.resolvedAt && <span className="muted">Resolved {formatDateTime(issue.resolvedAt)}</span>}
        </div>
        {issue.description && <p className="entry-body">{issue.description}</p>}
        {issue.resolutionNotes && (
          <p className="entry-body">
            <strong>Resolution:</strong> {issue.resolutionNotes}
          </p>
        )}
      </>
    );
  }
  if (tab === 'feedback') {
    const feedback = entry as Feedback;
    return (
      <>
        {head(feedback.subject)}
        <div className="badges">
          <Badge value={feedback.type} label={FEEDBACK_TYPES[feedback.type]} />
        </div>
        <p className="entry-body">{feedback.details}</p>
      </>
    );
  }
  const note = entry as Note;
  return (
    <>
      {head(note.title)}
      <p className="entry-body">{note.content}</p>
      <div className="badges">
        {note.tags.map((tag) => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
    </>
  );
}
