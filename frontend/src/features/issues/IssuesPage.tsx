import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Issue, IssueFilters, IssueUpdatePayload } from '../../api/diary';
import {
  createIssue,
  deleteIssue,
  issueSeverities,
  issueStatusLabels,
  issueStatuses,
  listIssues,
  updateIssue,
} from '../../api/diary';
import { useAuth } from '../../auth/auth-context';
import { buttonClass, inputClass } from '../../components/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ListState';
import { ConfirmDelete, RecruitOnlyNotice } from '../../components/Modal';
import { IssueFormDialog } from './IssueFormDialog';

const pageSize = 10;

const emptyFilters: IssueFilters = { from: '', to: '', severity: '', status: '', q: '' };

const severityClass: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-amber-100 text-amber-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

export function IssuesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<IssueFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; issue: Issue | null }>({
    open: false,
    issue: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Issue | null>(null);

  const isRecruit = user?.role === 'Recruit';
  const query = useQuery({
    queryKey: ['issues', filters, page],
    queryFn: () => listIssues({ ...filters, page, pageSize }),
    enabled: isRecruit,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['issues'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const save = useMutation({
    mutationFn: (payload: IssueUpdatePayload) =>
      dialog.issue
        ? updateIssue(dialog.issue.id, payload)
        : createIssue({
            entryDate: payload.entryDate,
            title: payload.title,
            description: payload.description,
            severity: payload.severity,
          }),
    onSuccess: () => {
      setDialog({ open: false, issue: null });
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (issue: Issue) => deleteIssue(issue.id),
    onSuccess: () => {
      setPendingDelete(null);
      invalidate();
    },
  });

  const updateFilter = (patch: Partial<IssueFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  if (!isRecruit) {
    return <RecruitOnlyNotice title="Issue log" />;
  }

  const issues = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Issue log</h1>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setDialog({ open: true, issue: null })}
        >
          New issue
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <span className="block text-slate-600">Severity</span>
          <select
            className={inputClass}
            value={filters.severity ?? ''}
            onChange={(event) =>
              updateFilter({ severity: event.target.value as IssueFilters['severity'] })
            }
          >
            <option value="">All</option>
            {issueSeverities.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Status</span>
          <select
            className={inputClass}
            value={filters.status ?? ''}
            onChange={(event) =>
              updateFilter({ status: event.target.value as IssueFilters['status'] })
            }
          >
            <option value="">All</option>
            {issueStatuses.map((status) => (
              <option key={status} value={status}>
                {issueStatusLabels[status]}
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

      {query.isPending ? <LoadingState label="Loading issues…" /> : null}

      {query.isError ? (
        <ErrorState
          error={query.error}
          fallback="Could not load issues. Try again."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && issues.length === 0 ? (
        <EmptyState message="No issues recorded. Raise one when something blocks you." />
      ) : null}

      {issues.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {issues.map((issue) => (
            <li key={issue.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{issue.title}</p>
                  <p className="text-slate-600">
                    {issue.entryDate} · {issueStatusLabels[issue.status]}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityClass[issue.severity]}`}
                  >
                    {issue.severity}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1"
                    onClick={() => setDialog({ open: true, issue })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-red-600"
                    onClick={() => setPendingDelete(issue)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {issue.resolutionNotes ? (
                <p className="text-slate-600">Resolution: {issue.resolutionNotes}</p>
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
        <IssueFormDialog
          issue={dialog.issue}
          pending={save.isPending}
          error={save.error}
          onSubmit={(payload) => save.mutate(payload)}
          onClose={() => setDialog({ open: false, issue: null })}
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
