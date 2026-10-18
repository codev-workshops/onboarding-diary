import { Link } from 'react-router-dom';
import { ISSUE_SEVERITIES, ISSUE_STATUSES, type Issue } from '../../api/entries';
import Badge from '../../components/Badge';
import DateRangeFilter from '../../components/DateRangeFilter';
import EntryListShell from '../../components/EntryListShell';
import OptionSelect from '../../components/OptionSelect';
import { formatDate } from '../../dates';
import { useFilters } from '../../hooks/useFilters';
import { usePaged } from '../../hooks/usePaged';

export default function IssuesPage() {
  const filters = useFilters();
  const { data, loading, error } = usePaged<Issue>('/api/issues', filters.params);

  return (
    <EntryListShell
      title="Issues"
      newPath="/issues/new"
      newLabel="Log issue"
      data={data}
      loading={loading}
      error={error}
      emptyText="No issues match these filters."
      onPage={(page) => filters.setFilter('page', String(page))}
      filters={
        <>
          <DateRangeFilter from={filters.get('from')} to={filters.get('to')} onChange={filters.setFilter} />
          <label className="filter">
            <span>Status</span>
            <OptionSelect
              options={ISSUE_STATUSES}
              emptyLabel="All statuses"
              value={filters.get('status')}
              onChange={(value) => filters.setFilter('status', value)}
            />
          </label>
          <label className="filter">
            <span>Severity</span>
            <OptionSelect
              options={ISSUE_SEVERITIES}
              emptyLabel="All severities"
              value={filters.get('severity')}
              onChange={(value) => filters.setFilter('severity', value)}
            />
          </label>
          <button type="button" className="link-button" onClick={filters.clear}>
            Clear
          </button>
        </>
      }
      renderItem={(issue) => (
        <>
          <div className="entry-head">
            <Link to={`/issues/${issue.id}/edit`} className="entry-title">
              {issue.title}
            </Link>
            <span className="muted">{formatDate(issue.entryDate)}</span>
          </div>
          <div className="badges">
            <Badge value={`severity-${issue.severity}`} label={ISSUE_SEVERITIES[issue.severity]} />
            <Badge value={issue.status} label={ISSUE_STATUSES[issue.status]} />
          </div>
          {issue.description && <p className="entry-body">{issue.description}</p>}
          {issue.resolutionNotes && (
            <p className="entry-body">
              <strong>Resolution:</strong> {issue.resolutionNotes}
            </p>
          )}
        </>
      )}
    />
  );
}
