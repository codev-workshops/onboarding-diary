import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Feedback, FeedbackFilters, FeedbackPayload } from '../../api/diary';
import {
  createFeedback,
  deleteFeedback,
  feedbackTypes,
  listFeedback,
  updateFeedback,
} from '../../api/diary';
import { useAuth } from '../../auth/auth-context';
import { buttonClass, inputClass } from '../../components/FormField';
import { ConfirmDelete, RecruitOnlyNotice } from '../../components/Modal';
import { FeedbackFormDialog } from './FeedbackFormDialog';

const pageSize = 10;

const emptyFilters: FeedbackFilters = { from: '', to: '', type: '', q: '' };

export function FeedbackPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FeedbackFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; feedback: Feedback | null }>({
    open: false,
    feedback: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Feedback | null>(null);

  const isRecruit = user?.role === 'Recruit';
  const query = useQuery({
    queryKey: ['feedback', filters, page],
    queryFn: () => listFeedback({ ...filters, page, pageSize }),
    enabled: isRecruit,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['feedback'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const save = useMutation({
    mutationFn: (payload: FeedbackPayload) =>
      dialog.feedback ? updateFeedback(dialog.feedback.id, payload) : createFeedback(payload),
    onSuccess: () => {
      setDialog({ open: false, feedback: null });
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (feedback: Feedback) => deleteFeedback(feedback.id),
    onSuccess: () => {
      setPendingDelete(null);
      invalidate();
    },
  });

  const updateFilter = (patch: Partial<FeedbackFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  if (!isRecruit) {
    return <RecruitOnlyNotice title="Feedback" />;
  }

  const entries = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Feedback</h1>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setDialog({ open: true, feedback: null })}
        >
          New feedback
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
          <span className="block text-slate-600">Type</span>
          <select
            className={inputClass}
            value={filters.type ?? ''}
            onChange={(event) =>
              updateFilter({ type: event.target.value as FeedbackFilters['type'] })
            }
          >
            <option value="">All</option>
            {feedbackTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
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

      {query.isPending ? <p className="text-sm text-slate-600">Loading feedback…</p> : null}

      {query.isError ? (
        <p role="alert" className="text-sm text-red-600">
          Could not load feedback. Try again.
        </p>
      ) : null}

      {!query.isPending && !query.isError && entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          No feedback shared yet.
        </div>
      ) : null}

      {entries.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {entries.map((entry) => (
            <li key={entry.id} className="space-y-1 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{entry.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {entry.type}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1"
                    onClick={() => setDialog({ open: true, feedback: entry })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-red-600"
                    onClick={() => setPendingDelete(entry)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-slate-600">{entry.message}</p>
              <p className="text-xs text-slate-500">{entry.entryDate}</p>
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
        <FeedbackFormDialog
          feedback={dialog.feedback}
          pending={save.isPending}
          error={save.error}
          onSubmit={(payload) => save.mutate(payload)}
          onClose={() => setDialog({ open: false, feedback: null })}
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
