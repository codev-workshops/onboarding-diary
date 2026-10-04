import { Stack, Typography } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { DiaryResource } from '../../api/diaryTypes';
import { getErrorMessage } from '../../api/errors';
import { listRecruitEntries } from '../../api/manager';
import { EntryList, type Column } from '../../components/diary/EntryList';
import { FilterBar, MultiSelectFilter } from '../../components/diary/Filters';
import { useUrlFilters } from '../../hooks/useUrlFilters';

export interface LogFilter {
  key: string;
  label: string;
  options: readonly string[];
}

interface Props<T extends { id: number }> {
  recruitId: number;
  resource: DiaryResource;
  columns: Column<T>[];
  renderCard: (item: T) => ReactNode;
  filter?: LogFilter;
  emptyMessage: string;
  note?: string;
}

/** Read-only, paginated list of one of a recruit's diary logs. */
export function RecruitLog<T extends { id: number }>({
  recruitId,
  resource,
  columns,
  renderCard,
  filter,
  emptyMessage,
  note,
}: Props<T>) {
  const filters = useUrlFilters();
  const query = useQuery({
    queryKey: ['recruit', recruitId, resource, filters.apiParams],
    queryFn: () => listRecruitEntries<T>(recruitId, resource, filters.apiParams),
    placeholderData: keepPreviousData,
  });

  return (
    <Stack spacing={2}>
      {note && (
        <Typography variant="body2" color="text.secondary">
          {note}
        </Typography>
      )}
      {filter && (
        <FilterBar>
          <MultiSelectFilter
            label={filter.label}
            options={filter.options}
            selected={filters.values(filter.key)}
            onChange={(selected) => filters.update({ [filter.key]: selected })}
          />
        </FilterBar>
      )}
      <EntryList
        data={query.data}
        isLoading={query.isLoading}
        error={query.error ? getErrorMessage(query.error, `Could not load ${resource}`) : null}
        emptyMessage={filters.hasFilters ? 'Nothing matches these filters.' : emptyMessage}
        columns={columns}
        renderCard={renderCard}
        renderActions={() => null}
        page={filters.page}
        onPageChange={filters.setPage}
      />
    </Stack>
  );
}
