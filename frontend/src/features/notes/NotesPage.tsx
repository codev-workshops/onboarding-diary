import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Note, NoteFilters, NotePayload } from '../../api/diary';
import { createNote, deleteNote, listNotes, updateNote } from '../../api/diary';
import { useAuth } from '../../auth/auth-context';
import { buttonClass, inputClass } from '../../components/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ListState';
import { ConfirmDelete, RecruitOnlyNotice } from '../../components/Modal';
import { NoteFormDialog } from './NoteFormDialog';

const pageSize = 10;

const emptyFilters: NoteFilters = { from: '', to: '', tag: '', q: '' };

export function NotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<NoteFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; note: Note | null }>({
    open: false,
    note: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

  const isRecruit = user?.role === 'Recruit';
  const query = useQuery({
    queryKey: ['notes', filters, page],
    queryFn: () => listNotes({ ...filters, page, pageSize }),
    enabled: isRecruit,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notes'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const save = useMutation({
    mutationFn: (payload: NotePayload) =>
      dialog.note ? updateNote(dialog.note.id, payload) : createNote(payload),
    onSuccess: () => {
      setDialog({ open: false, note: null });
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (note: Note) => deleteNote(note.id),
    onSuccess: () => {
      setPendingDelete(null);
      invalidate();
    },
  });

  const updateFilter = (patch: Partial<NoteFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  if (!isRecruit) {
    return <RecruitOnlyNotice title="Notes" />;
  }

  const notes = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Notes</h1>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setDialog({ open: true, note: null })}
        >
          New note
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="block text-slate-600">From</span>
          <input
            type="date"
            className={inputClass}
            value={filters.from ?? ''}
            onChange={(event) => updateFilter({ from: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">To</span>
          <input
            type="date"
            className={inputClass}
            value={filters.to ?? ''}
            onChange={(event) => updateFilter({ to: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Tag</span>
          <input
            className={inputClass}
            value={filters.tag ?? ''}
            onChange={(event) => updateFilter({ tag: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Search</span>
          <input
            type="search"
            className={inputClass}
            value={filters.q ?? ''}
            onChange={(event) => updateFilter({ q: event.target.value })}
          />
        </label>
      </div>

      {query.isPending ? <LoadingState label="Loading notes…" /> : null}

      {query.isError ? (
        <ErrorState
          error={query.error}
          fallback="Could not load notes. Try again."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && notes.length === 0 ? (
        <EmptyState message="No notes captured yet." />
      ) : null}

      {notes.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {notes.map((note) => (
            <li key={note.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{note.title}</p>
                  <p className="text-xs text-slate-500">{note.entryDate}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1"
                    onClick={() => setDialog({ open: true, note })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-red-600"
                    onClick={() => setPendingDelete(note)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-line text-slate-600">{note.content}</p>
              {note.tags.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <li key={tag}>
                      <button
                        type="button"
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                        onClick={() => updateFilter({ tag })}
                      >
                        #{tag}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {total > pageSize ? (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
            disabled={page >= lastPage}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      {dialog.open ? (
        <NoteFormDialog
          note={dialog.note}
          pending={save.isPending}
          error={save.error}
          onSubmit={(payload) => save.mutate(payload)}
          onClose={() => setDialog({ open: false, note: null })}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDelete
          label={pendingDelete.title}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  );
}
