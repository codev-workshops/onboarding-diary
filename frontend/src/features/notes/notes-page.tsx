import AddIcon from '@mui/icons-material/Add';
import { Button, Chip, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { getErrorMessage } from '../../shared/api/api-client';
import { formatDate } from '../../shared/lib/format';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { EntryList, type EntryColumn } from '../../shared/ui/entry-list';
import { FilterBar } from '../../shared/ui/filter-bar';
import { PageHeader } from '../../shared/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states';
import type { NoteEntry } from '../../shared/types';
import { useRecruitContext } from '../recruits/recruit-context';
import { notesApi } from './api';
import { NoteFormDialog } from './note-form-dialog';
import type { NoteFormValues } from './schema';

export function NotesPage() {
  const { recruitId, isReadOnly } = useRecruitContext();
  const [filters, setFilters] = useState({ from: '', to: '', tag: '', search: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<NoteEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<NoteEntry | null>(null);

  const list = notesApi.useList({ ...filters, recruitId, page, pageSize });
  const create = notesApi.useCreate();
  const update = notesApi.useUpdate();
  const remove = notesApi.useRemove();

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const columns: EntryColumn<NoteEntry>[] = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'title', label: 'Title', primary: true, render: (row) => row.title },
    {
      key: 'tags',
      label: 'Tags',
      render: (row) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          {row.tags.length === 0 ? '—' : row.tags.map((tag) => <Chip key={tag} size="small" label={tag} />)}
        </Stack>
      ),
    },
  ];

  const handleSubmit = (values: NoteFormValues) => {
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
        title="Additional notes"
        subtitle="Anything else worth remembering from your onboarding."
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
              New note
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
          label="Tag"
          size="small"
          value={filters.tag}
          onChange={(event) => updateFilter('tag', event.target.value)}
        />
        <TextField
          label="Search"
          size="small"
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
        />
      </FilterBar>

      {list.isPending ? <LoadingState /> : null}
      {list.isError ? <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} /> : null}
      {list.data && list.data.items.length === 0 ? <EmptyState title="No notes yet" /> : null}
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

      <NoteFormDialog
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
        title="Delete note"
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
