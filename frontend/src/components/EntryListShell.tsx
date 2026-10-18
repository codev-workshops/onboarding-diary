import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Page } from '../api/types';
import Alert from './Alert';
import Pagination from './Pagination';

interface Props<T> {
  title: string;
  newPath: string;
  newLabel: string;
  filters: ReactNode;
  data: Page<T> | null;
  loading: boolean;
  error: string;
  emptyText: string;
  onPage: (page: number) => void;
  renderItem: (item: T) => ReactNode;
}

/** Page header, filter bar, list and pagination shared by all entry logs. */
export default function EntryListShell<T extends { id: number }>({
  title,
  newPath,
  newLabel,
  filters,
  data,
  loading,
  error,
  emptyText,
  onPage,
  renderItem,
}: Props<T>) {
  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
        <div className="actions">
          <Link className="btn btn-primary" to={newPath}>
            {newLabel}
          </Link>
        </div>
      </div>
      <div className="card filter-bar">{filters}</div>
      <Alert>{error}</Alert>
      {loading && !data && <p className="muted">Loading…</p>}
      {data && data.content.length === 0 && <p className="empty-page">{emptyText}</p>}
      {data && data.content.length > 0 && (
        <>
          <p className="muted result-count">
            {data.totalElements} {data.totalElements === 1 ? 'entry' : 'entries'}
          </p>
          <ul className="entry-list">
            {data.content.map((item) => (
              <li key={item.id} className="card entry-item">
                {renderItem(item)}
              </li>
            ))}
          </ul>
          <Pagination page={data} onChange={onPage} />
        </>
      )}
    </>
  );
}
