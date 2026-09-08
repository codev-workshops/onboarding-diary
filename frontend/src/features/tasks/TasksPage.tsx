import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import type { Task, TaskFilters, TaskPayload, TaskStatus } from '../../api/tasks';
import {
  createTask,
  deleteTask,
  listTasks,
  statusLabels,
  taskCategories,
  taskPriorities,
  taskStatuses,
  updateTask,
} from '../../api/tasks';
import { useAuth } from '../../auth/auth-context';
import { buttonClass, inputClass } from '../../components/FormField';
import { TaskFormDialog } from './TaskFormDialog';

const pageSize = 10;

const emptyFilters: TaskFilters = {
  from: '',
  to: '',
  category: '',
  status: '',
  priority: '',
  q: '',
};

export function TasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  const isRecruit = user?.role === 'Recruit';
  const query = useQuery({
    queryKey: ['tasks', filters, page],
    queryFn: () => listTasks({ ...filters, page, pageSize }),
    enabled: isRecruit,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const save = useMutation({
    mutationFn: (payload: TaskPayload) =>
      dialog.task ? updateTask(dialog.task.id, payload) : createTask(payload),
    onSuccess: () => {
      setDialog({ open: false, task: null });
      invalidate();
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ task, status }: { task: Task; status: TaskStatus }) =>
      updateTask(task.id, {
        entryDate: task.entryDate,
        title: task.title,
        description: task.description,
        category: task.category,
        status,
        priority: task.priority,
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (task: Task) => deleteTask(task.id),
    onSuccess: () => {
      setPendingDelete(null);
      invalidate();
    },
  });

  const updateFilter = (patch: Partial<TaskFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  if (!isRecruit) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Task log</h1>
        <p className="text-sm text-slate-600">
          Only recruits keep a task log. Read-only access to your recruits&apos; entries arrives
          with the team view.
        </p>
      </section>
    );
  }

  const tasks = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Task log</h1>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setDialog({ open: true, task: null })}
        >
          New task
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
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
          <span className="block text-slate-600">Category</span>
          <select
            className={inputClass}
            value={filters.category ?? ''}
            onChange={(event) =>
              updateFilter({ category: event.target.value as TaskFilters['category'] })
            }
          >
            <option value="">All</option>
            {taskCategories.map((category) => (
              <option key={category} value={category}>
                {category}
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
              updateFilter({ status: event.target.value as TaskFilters['status'] })
            }
          >
            <option value="">All</option>
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Priority</span>
          <select
            className={inputClass}
            value={filters.priority ?? ''}
            onChange={(event) =>
              updateFilter({ priority: event.target.value as TaskFilters['priority'] })
            }
          >
            <option value="">All</option>
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
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

      {query.isPending ? <p className="text-sm text-slate-600">Loading tasks…</p> : null}

      {query.isError ? (
        <div role="alert" className="space-y-2 text-sm text-red-600">
          <p>
            {query.error instanceof ApiError
              ? query.error.message
              : 'Could not load tasks. Try again.'}
          </p>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700"
            onClick={() => void query.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {query.isSuccess && tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-600">No tasks yet.</p>
          <button
            type="button"
            className={`mt-3 ${buttonClass}`}
            onClick={() => setDialog({ open: true, task: null })}
          >
            Log your first task
          </button>
        </div>
      ) : null}

      {tasks.length > 0 ? (
        <ul className="space-y-3 md:hidden">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-slate-600">
                {task.entryDate} · {task.category} · {task.priority}
              </p>
              <TaskRowActions
                task={task}
                onStatusChange={(status) => changeStatus.mutate({ task, status })}
                onEdit={() => setDialog({ open: true, task })}
                onDelete={() => setPendingDelete(task)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {tasks.length > 0 ? (
        <table className="hidden w-full table-auto border-collapse text-left text-sm md:table">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Priority</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-slate-100">
                <td className="py-2 pr-3 whitespace-nowrap">{task.entryDate}</td>
                <td className="py-2 pr-3">{task.title}</td>
                <td className="py-2 pr-3">{task.category}</td>
                <td className="py-2 pr-3">{task.priority}</td>
                <td className="py-2 pr-3" colSpan={2}>
                  <TaskRowActions
                    task={task}
                    onStatusChange={(status) => changeStatus.mutate({ task, status })}
                    onEdit={() => setDialog({ open: true, task })}
                    onDelete={() => setPendingDelete(task)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <TaskFormDialog
          task={dialog.task}
          pending={save.isPending}
          error={save.error}
          onSubmit={(payload) => save.mutate(payload)}
          onClose={() => setDialog({ open: false, task: null })}
        />
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
          >
            <p className="text-sm">Delete “{pendingDelete.title}”? This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={remove.isPending}
                onClick={() => remove.mutate(pendingDelete)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TaskRowActions({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-0">
      <label className="sr-only" htmlFor={`status-${task.id}`}>
        Status for {task.title}
      </label>
      <select
        id={`status-${task.id}`}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        value={task.status}
        onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
      >
        {taskStatuses.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        onClick={onEdit}
      >
        Edit
      </button>
      <button
        type="button"
        className="rounded-md border border-slate-300 px-2 py-1 text-sm text-red-600"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}
