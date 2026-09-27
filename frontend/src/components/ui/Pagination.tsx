import type { Page } from "@/lib/apiClient";
import styles from "./table.module.css";

interface PaginationProps {
  page: Page<unknown> | null;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/** Prev/next controls for the shared `Page<T>` envelope. */
export function Pagination({ page, onPageChange, disabled }: PaginationProps) {
  if (!page || page.totalPages <= 1) return null;
  const first = page.page * page.size + 1;
  const last = Math.min(page.totalItems, first + page.items.length - 1);
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <span className={styles.muted} data-testid="pagination-summary">
        {first}–{last} of {page.totalItems} · page {page.page + 1} of {page.totalPages}
      </span>
      <div className={styles.pageButtons}>
        <button
          type="button"
          className={styles.pageButton}
          onClick={() => onPageChange(page.page - 1)}
          disabled={disabled || page.page === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.pageButton}
          onClick={() => onPageChange(page.page + 1)}
          disabled={disabled || page.page >= page.totalPages - 1}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
