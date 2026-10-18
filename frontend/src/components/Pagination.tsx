import type { Page } from '../api/types';

interface Props {
  page: Page<unknown>;
  onChange: (page: number) => void;
}

export default function Pagination({ page, onChange }: Props) {
  if (page.totalPages <= 1) {
    return null;
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="btn btn-small"
        disabled={page.page === 0}
        onClick={() => onChange(page.page - 1)}
      >
        Previous
      </button>
      <span className="muted">
        Page {page.page + 1} of {page.totalPages}
      </span>
      <button
        type="button"
        className="btn btn-small"
        disabled={page.page + 1 >= page.totalPages}
        onClick={() => onChange(page.page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
