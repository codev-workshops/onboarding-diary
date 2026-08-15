import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Chip, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage } from '../../shared/api/api-client';
import { formatDate, humanize, todayIso } from '../../shared/lib/format';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { EntryList, type EntryColumn } from '../../shared/ui/entry-list';
import { FilterBar } from '../../shared/ui/filter-bar';
import { PageHeader } from '../../shared/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';
import { feedbackTypes, type FeedbackEntry } from '../../shared/types';
import { useRecruitContext } from '../recruits/recruit-context';
import { feedbackApi } from './api';
import { feedbackSchema, type FeedbackFormValues } from './schema';

const typeColor: Record<string, 'success' | 'info' | 'warning'> = {
  Positive: 'success',
  Suggestion: 'info',
  Concern: 'warning',
};

const emptyValues: FeedbackFormValues = { date: todayIso(), subject: '', type: 'Positive', details: '' };

export function FeedbackPage() {
  const { recruitId, isReadOnly } = useRecruitContext();
  const [filters, setFilters] = useState({ from: '', to: '', type: '', search: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingDelete, setPendingDelete] = useState<FeedbackEntry | null>(null);

  const list = feedbackApi.useList({ ...filters, recruitId, page, pageSize });
  const create = feedbackApi.useCreate();
  const remove = feedbackApi.useRemove();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormValues>({ resolver: zodResolver(feedbackSchema), defaultValues: emptyValues });

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const columns: EntryColumn<FeedbackEntry>[] = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'subject', label: 'Subject', primary: true, render: (row) => row.subject },
    {
      key: 'type',
      label: 'Type',
      render: (row) => <Chip size="small" color={typeColor[row.type]} label={humanize(row.type)} />,
    },
    { key: 'details', label: 'Details', render: (row) => row.details ?? '—' },
  ];

  return (
    <>
      <PageHeader title="Feedback notes" subtitle="Share what is working well and what could improve." />

      {isReadOnly ? null : (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 3 }}
          component="form"
          onSubmit={handleSubmit((values) => create.mutate(values, { onSuccess: () => reset(emptyValues) }))}
        >
          <Stack spacing={2}>
            {create.isError ? <Alert severity="error">{getErrorMessage(create.error)}</Alert> : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Date"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                {...register('date')}
                error={Boolean(errors.date)}
                helperText={errors.date?.message}
              />
              <TextField
                label="Subject"
                fullWidth
                {...register('subject')}
                error={Boolean(errors.subject)}
                helperText={errors.subject?.message}
              />
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <TextField select label="Type" sx={{ minWidth: 180 }} {...field}>
                    {feedbackTypes.map((option) => (
                      <MenuItem key={option} value={option}>
                        {humanize(option)}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>
            <TextField label="Details" multiline minRows={2} {...register('details')} />
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" disabled={create.isPending}>
                Submit feedback
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <FilterBar>
        <TextField
          label="From"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.from}
          onChange={(event) => updateFilter('from', event.target.value)}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.to}
          onChange={(event) => updateFilter('to', event.target.value)}
        />
        <TextField
          select
          label="Type"
          size="small"
          sx={{ minWidth: 160 }}
          value={filters.type}
          onChange={(event) => updateFilter('type', event.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {feedbackTypes.map((option) => (
            <MenuItem key={option} value={option}>
              {humanize(option)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Search"
          size="small"
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
        />
      </FilterBar>

      {list.isPending ? <LoadingState /> : null}
      {list.isError ? <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} /> : null}
      {list.data && list.data.items.length === 0 ? <EmptyState title="No feedback yet" /> : null}
      {list.data && list.data.items.length > 0 ? (
        <EntryList
          rows={list.data.items}
          columns={columns}
          total={list.data.total}
          page={list.data.page}
          pageSize={list.data.pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onDelete={isReadOnly ? undefined : (row) => setPendingDelete(row)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete feedback"
        message={`Delete "${pendingDelete?.subject ?? ''}"? This cannot be undone.`}
        busy={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
          }
        }}
      />
    </>
  );
}
