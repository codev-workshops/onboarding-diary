import { Link } from 'react-router-dom';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, type Task } from '../../api/entries';
import Badge from '../../components/Badge';
import DateRangeFilter from '../../components/DateRangeFilter';
import EntryListShell from '../../components/EntryListShell';
import OptionSelect from '../../components/OptionSelect';
import { formatDate } from '../../dates';
import { useFilters } from '../../hooks/useFilters';
import { usePaged } from '../../hooks/usePaged';

export default function TasksPage() {
  const filters = useFilters();
  const { data, loading, error } = usePaged<Task>('/api/tasks', filters.params);

  return (
    <EntryListShell
      title="Tasks"
      newPath="/tasks/new"
      newLabel="New task"
      data={data}
      loading={loading}
      error={error}
      emptyText="No tasks match these filters yet."
      onPage={(page) => filters.setFilter('page', String(page))}
      filters={
        <>
          <DateRangeFilter from={filters.get('from')} to={filters.get('to')} onChange={filters.setFilter} />
          <label className="filter">
            <span>Category</span>
            <OptionSelect
              options={TASK_CATEGORIES}
              emptyLabel="All categories"
              value={filters.get('category')}
              onChange={(value) => filters.setFilter('category', value)}
            />
          </label>
          <label className="filter">
            <span>Status</span>
            <OptionSelect
              options={TASK_STATUSES}
              emptyLabel="All statuses"
              value={filters.get('status')}
              onChange={(value) => filters.setFilter('status', value)}
            />
          </label>
          <button type="button" className="link-button" onClick={filters.clear}>
            Clear
          </button>
        </>
      }
      renderItem={(task) => (
        <>
          <div className="entry-head">
            <Link to={`/tasks/${task.id}/edit`} className="entry-title">
              {task.title}
            </Link>
            <span className="muted">{formatDate(task.entryDate)}</span>
          </div>
          <div className="badges">
            <Badge value={task.status} label={TASK_STATUSES[task.status]} />
            <Badge value={`priority-${task.priority}`} label={`${TASK_PRIORITIES[task.priority]} priority`} />
            <span className="tag">{TASK_CATEGORIES[task.category]}</span>
          </div>
          {task.description && <p className="entry-body">{task.description}</p>}
        </>
      )}
    />
  );
}
