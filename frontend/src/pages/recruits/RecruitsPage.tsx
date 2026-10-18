import { Link } from 'react-router-dom';
import type { UserRef } from '../../api/types';
import Alert from '../../components/Alert';
import Pagination from '../../components/Pagination';
import { formatDate } from '../../dates';
import { useFilters } from '../../hooks/useFilters';
import { usePaged } from '../../hooks/usePaged';

interface RecruitSummary {
  id: number;
  name: string;
  email: string;
  department: string | null;
  startDate: string | null;
  manager: UserRef | null;
  active: boolean;
  openIssues: number;
  taskPercent: number | null;
}

export default function RecruitsPage() {
  const filters = useFilters();
  const { data, loading, error } = usePaged<RecruitSummary>('/api/recruits', filters.params);

  return (
    <>
      <div className="page-header">
        <h1>Recruits</h1>
      </div>
      <div className="card filter-bar">
        <label className="filter">
          <span>Search</span>
          <input
            type="search"
            placeholder="Name or email"
            value={filters.get('q')}
            onChange={(e) => filters.setFilter('q', e.target.value)}
          />
        </label>
      </div>
      <Alert>{error}</Alert>
      {loading && !data && <p className="muted">Loading…</p>}
      {data && data.content.length === 0 && (
        <p className="empty-page">No recruits are assigned to you yet.</p>
      )}
      {data && data.content.length > 0 && (
        <>
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Start date</th>
                  <th>Manager</th>
                  <th>Tasks done</th>
                  <th>Open issues</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Name">
                      <Link to={`/recruits/${r.id}`}>{r.name}</Link>
                      {!r.active && <span className="muted"> (deactivated)</span>}
                      <div className="muted small">{r.email}</div>
                    </td>
                    <td data-label="Department">{r.department ?? '—'}</td>
                    <td data-label="Start date">{formatDate(r.startDate)}</td>
                    <td data-label="Manager">{r.manager?.name ?? 'Unassigned'}</td>
                    <td data-label="Tasks done">{r.taskPercent === null ? 'No tasks' : `${r.taskPercent}%`}</td>
                    <td data-label="Open issues">{r.openIssues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data} onChange={(page) => filters.setFilter('page', String(page))} />
        </>
      )}
    </>
  );
}
