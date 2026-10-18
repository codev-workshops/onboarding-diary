import { Link } from 'react-router-dom';
import { FEEDBACK_TYPES, type Feedback } from '../../api/entries';
import Badge from '../../components/Badge';
import DateRangeFilter from '../../components/DateRangeFilter';
import EntryListShell from '../../components/EntryListShell';
import OptionSelect from '../../components/OptionSelect';
import { formatDate } from '../../dates';
import { useFilters } from '../../hooks/useFilters';
import { usePaged } from '../../hooks/usePaged';

export default function FeedbackListPage() {
  const filters = useFilters();
  const { data, loading, error } = usePaged<Feedback>('/api/feedback', filters.params);

  return (
    <EntryListShell
      title="Feedback"
      newPath="/feedback/new"
      newLabel="Give feedback"
      data={data}
      loading={loading}
      error={error}
      emptyText="No feedback yet."
      onPage={(page) => filters.setFilter('page', String(page))}
      filters={
        <>
          <DateRangeFilter from={filters.get('from')} to={filters.get('to')} onChange={filters.setFilter} />
          <label className="filter">
            <span>Type</span>
            <OptionSelect
              options={FEEDBACK_TYPES}
              emptyLabel="All types"
              value={filters.get('type')}
              onChange={(value) => filters.setFilter('type', value)}
            />
          </label>
          <button type="button" className="link-button" onClick={filters.clear}>
            Clear
          </button>
        </>
      }
      renderItem={(feedback) => (
        <>
          <div className="entry-head">
            <Link to={`/feedback/${feedback.id}/edit`} className="entry-title">
              {feedback.subject}
            </Link>
            <span className="muted">{formatDate(feedback.entryDate)}</span>
          </div>
          <div className="badges">
            <Badge value={feedback.type} label={FEEDBACK_TYPES[feedback.type]} />
          </div>
          <p className="entry-body">{feedback.details}</p>
        </>
      )}
    />
  );
}
