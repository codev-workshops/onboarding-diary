import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { listDepartments } from '../../api/auth';
import type {
  ChecklistTemplate,
  ChecklistTemplateFilters,
  ChecklistTemplatePayload,
} from '../../api/checklists';
import {
  createChecklistTemplate,
  deleteChecklistTemplate,
  listChecklistTemplates,
  updateChecklistTemplate,
} from '../../api/checklists';
import { useAuth } from '../../auth/auth-context';
import { buttonClass, inputClass } from '../../components/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ListState';
import { ChecklistTemplateDialog } from './ChecklistTemplateDialog';

const pageSize = 10;

export function ChecklistTemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ChecklistTemplateFilters>({ q: '' });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; template: ChecklistTemplate | null }>({
    open: false,
    template: null,
  });

  const query = useQuery({
    queryKey: ['checklist-templates', filters, page],
    queryFn: () => listChecklistTemplates({ ...filters, page, pageSize }),
  });

  const departments = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });

  const save = useMutation({
    mutationFn: (payload: ChecklistTemplatePayload) =>
      dialog.template
        ? updateChecklistTemplate(dialog.template.id, payload)
        : createChecklistTemplate(payload),
    onSuccess: () => {
      setDialog({ open: false, template: null });
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: deleteChecklistTemplate,
    onSuccess: invalidate,
  });

  const templates = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Checklist templates</h1>
        {isAdmin ? (
          <button
            type="button"
            className={buttonClass}
            onClick={() => setDialog({ open: true, template: null })}
          >
            New template
          </button>
        ) : null}
      </div>

      <p className="text-sm text-slate-600">
        Recruits apply a template to themselves; it then generates ordinary tasks dated from their
        start date. Editing a template only affects future applications.
      </p>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="block text-slate-600">Search</span>
          <input
            type="search"
            className={inputClass}
            value={filters.q ?? ''}
            onChange={(event) => {
              setFilters((current) => ({ ...current, q: event.target.value }));
              setPage(1);
            }}
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Department</span>
          <select
            className={inputClass}
            value={filters.departmentId ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                departmentId: value === '' ? '' : Number(value),
              }));
              setPage(1);
            }}
          >
            <option value="">All</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Status</span>
          <select
            className={inputClass}
            value={filters.isActive === undefined ? '' : String(filters.isActive)}
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                isActive: value === '' ? undefined : value === 'true',
              }));
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Retired</option>
          </select>
        </label>
      </div>

      {query.isPending ? <LoadingState label="Loading templates…" /> : null}

      {query.isError ? (
        <ErrorState
          error={query.error}
          fallback="Could not load templates. Try again."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {remove.isError ? (
        <p role="alert" className="text-sm text-red-600">
          {remove.error instanceof Error ? remove.error.message : 'Could not delete that template.'}
        </p>
      ) : null}

      {query.isSuccess && templates.length === 0 ? (
        <EmptyState message="No checklist templates match these filters." />
      ) : null}

      {templates.length > 0 ? (
        <ul className="space-y-3">
          {templates.map((template) => (
            <li
              key={template.id}
              className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-slate-600">
                    {template.departmentName ?? 'Every department'} · {template.itemCount} items ·{' '}
                    {template.isActive ? 'Active' : 'Retired'} · applied {template.assignmentCount}{' '}
                    times
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      onClick={() => setDialog({ open: true, template })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>

              {template.description ? (
                <p className="text-sm text-slate-700">{template.description}</p>
              ) : null}

              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {template.items.map((item) => (
                  <li key={item.id}>
                    {item.title}{' '}
                    <span className="text-slate-500">
                      ({item.category}
                      {item.dueOffsetDays === null ? '' : `, day ${item.dueOffsetDays}`})
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      ) : null}

      {total > pageSize ? (
        <div className="flex items-center gap-3 text-sm">
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
        <ChecklistTemplateDialog
          template={dialog.template}
          departments={departments.data ?? []}
          pending={save.isPending}
          error={save.error}
          onSave={(payload) => save.mutate(payload)}
          onClose={() => setDialog({ open: false, template: null })}
        />
      ) : null}
    </section>
  );
}
