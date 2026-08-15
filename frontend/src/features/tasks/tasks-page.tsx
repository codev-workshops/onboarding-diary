import AddIcon from '@mui/icons-material/Add';
import { Button, Chip, MenuItem, TextField } from '@mui/material';
import { useState } from 'react';
import { getErrorMessage } from '../../shared/api/api-client';
import { formatDate, humanize } from '../../shared/lib/format';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { EntryList, type EntryColumn } from '../../shared/ui/entry-list';
import { FilterBar } from '../../shared/ui/filter-bar';
import { PageHeader } from '../../shared/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';
import { taskCategories, taskStatuses, type TaskEntry } from '../../shared/types';
import { useRecruitContext } from '../recruits/recruit-context';
import { tasksApi } from './api';
import { TaskFormDialog } from './task-form-dialog';
import type { TaskFormValues } from './schema';

const statusColor: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  NotStarted: 'default',
  InProgress: 'info',
  Blocked: 'warning',
  Completed: 'success',
};

export function TasksPage() {
  const { recruitId, isReadOnly } = useRecruitContext();
  const [filters, setFilters] = useState({ from: '', to: '', category: '', status: '', search: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<TaskEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TaskEntry | null>(null);

  const list = tasksApi.useList({ ...filters, recruitId, page, pageSize });
  const create = tasksApi.useCreate();
  const update = tasksApi.useUpdate();
  const remove = tasksApi.useRemove();

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const columns: EntryColumn<TaskEntry>[] = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'title', label: 'Title', primary: true, render: (row) => row.title },
    { key: 'category', label: 'Category', render: (row) => humanize(row.category) },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Chip size="small" color={statusColor[row.status]} label={humanize(row.status)} />,
    },
    { key: 'priority', label: 'Priority', render: (row) => humanize(row.priority) },
  ];

  const handleSubmit = (values: TaskFormValues) => {
    const onSuccess = () => {
      setFormOpen(false);
      setEditing(null);
    };
    if (editing) {
      update.mutate({ id: editing.id, payload: values }, { onSuccess });
    } else {
      create.mutate(values, { onSuccess });
    }
  };

  return (
    <>
      <PageHeader
        title="Task log"
        subtitle="Everything you worked on during onboarding."
        action={
          isReadOnly ? undefined : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New task
            </Button>
          )
        }
      />

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
          label="Category"
          size="small"
          sx={{ minWidth: 160 }}
          value={filters.category}
          onChange={(event) => updateFilter('category', event.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {taskCategories.map((option) => (
            <MenuItem key={option} value={option}>
              {humanize(option)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          size="small"
          sx={{ minWidth: 160 }}
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {taskStatuses.map((option) => (
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
      {list.data && list.data.items.length === 0 ? (
        <EmptyState title="No tasks yet" description="Log your first onboarding task to get started." />
      ) : null}
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
          onEdit={
            isReadOnly
              ? undefined
              : (row) => {
                  setEditing(row);
                  setFormOpen(true);
                }
          }
          onDelete={isReadOnly ? undefined : (row) => setPendingDelete(row)}
        />
      ) : null}

      <TaskFormDialog
        open={formOpen}
        entry={editing}
        saving={create.isPending || update.isPending}
        error={create.error ?? update.error}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete task"
        message={`Delete "${pendingDelete?.title ?? ''}"? This cannot be undone.`}
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
