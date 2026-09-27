"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import type { EntryBase, Page } from "@/lib/apiClient";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import styles from "./entries.module.css";

interface EntryListProps<T extends EntryBase> {
  page: Page<T> | null;
  loading: boolean;
  error: string | null;
  /** Card body for one entry. */
  renderItem: (entry: T) => ReactNode;
  /** When given, each card links to the entry's detail route. */
  hrefFor?: (entry: T) => string;
  onPageChange: (page: number) => void;
  emptyMessage: ReactNode;
  /** Shown when the list is empty because filters are active. */
  filteredEmptyMessage?: ReactNode;
  hasActiveFilters?: boolean;
  testId?: string;
}

/** Generic paginated card list over the frozen `Page<T>` envelope with loading / error / empty states. */
export function EntryList<T extends EntryBase>({
  page,
  loading,
  error,
  renderItem,
  hrefFor,
  onPageChange,
  emptyMessage,
  filteredEmptyMessage,
  hasActiveFilters,
  testId = "entry-list",
}: EntryListProps<T>) {
  return (
    <div aria-busy={loading} data-testid={testId}>
      {error && (
        <div className={formStyles.formError} role="alert">
          {error}
        </div>
      )}
      {!page && loading && <p className={tableStyles.muted}>Loading…</p>}
      {page && page.items.length === 0 && (
        <p className={tableStyles.empty} data-testid={`${testId}-empty`}>
          {hasActiveFilters && filteredEmptyMessage ? filteredEmptyMessage : emptyMessage}
        </p>
      )}
      {page && page.items.length > 0 && (
        <ul className={styles.list}>
          {page.items.map((entry) => (
            <li key={entry.id} data-testid={`${testId}-item`}>
              {hrefFor ? (
                <Link href={hrefFor(entry)} className={styles.item}>
                  {renderItem(entry)}
                </Link>
              ) : (
                <div className={styles.item}>{renderItem(entry)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} onPageChange={onPageChange} disabled={loading} />
    </div>
  );
}
