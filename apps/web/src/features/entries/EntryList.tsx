/**
 * Renders the loading, error, empty, and populated states of a paginated entry list so all
 * four resources behave identically (FR-T4, FR-X7).
 */

import type { PaginatedEnvelope } from '@onboarding-diary/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { Pagination } from '../../components/ui/Pagination.js';
import { Table, type Column } from '../../components/ui/Table.js';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/states.js';

export function EntryList<T>({
  query,
  columns,
  caption,
  rowKey,
  emptyTitle,
  emptyDescription,
  emptyAction,
  page,
  onPageChange,
}: {
  query: UseQueryResult<PaginatedEnvelope<T>>;
  columns: readonly Column<T>[];
  caption: string;
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription?: string | undefined;
  emptyAction?: ReactNode | undefined;
  page: number;
  onPageChange: (page: number) => void;
}): ReactNode {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label={`Loading ${caption}`}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { data, meta } = query.data;
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        {...(emptyDescription === undefined ? {} : { description: emptyDescription })}
        {...(emptyAction === undefined ? {} : { action: emptyAction })}
      />
    );
  }

  return (
    <div>
      <Table caption={caption} columns={columns} rows={data} rowKey={rowKey} />
      <Pagination
        page={page}
        pageSize={meta.pageSize}
        total={meta.total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
