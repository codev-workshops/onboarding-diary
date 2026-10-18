import type { Page } from '../api/types';

interface Props {
  page: Page<unknown>;
  onChange: (page: number) => void;
}

/** Previous/next controls; also offers a way back when the requested page is past the end. */
export default function Pagination({ page, onChange }: Props) {
  if (page.page > 0 && page.page >= page.totalPages) {
    const target = Math.max(0, page.totalPages - 1);
    return (
      <nav className="pagination" aria-label="Pagination">
        <span className="muted">Page {page.page + 1} is past the end of the results.</span>
        <button type="button" className="btn btn-small" onClick={() => onChange(target)}>
          {target === 0 ? 'Go to first page' : `Go to page ${target + 1}`}
        </button>
      </nav>
    );
  }
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
