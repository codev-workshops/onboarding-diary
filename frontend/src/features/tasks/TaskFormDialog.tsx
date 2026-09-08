import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Task, TaskPayload } from '../../api/tasks';
import { taskCategories, taskPriorities, taskStatuses, statusLabels } from '../../api/tasks';
import { ApiError } from '../../api/client';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { zodResolver } from '../../lib/zod-resolver';

const taskSchema = z.object({
  entryDate: z.string().min(1, 'Pick a date.'),
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(120),
  description: z.string().max(5000).optional(),
  category: z.enum(taskCategories),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
});

type TaskForm = z.infer<typeof taskSchema>;

const today = () => new Date().toISOString().slice(0, 10);

/** Prefers the per-field validation messages so the user learns which input the API rejected. */
function serverMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) {
    return ['Something went wrong. Try again.'];
  }

  const fieldMessages = Object.values(error.fieldErrors);
  return fieldMessages.length > 0 ? fieldMessages : [error.message];
}

export function TaskFormDialog({
  task,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  task: Task | null;
  pending: boolean;
  error: unknown;
  onSubmit: (payload: TaskPayload) => void;
  onClose: () => void;
}) {
  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      entryDate: task?.entryDate ?? today(),
      title: task?.title ?? '',
      description: task?.description ?? '',
      category: task?.category ?? 'Training',
      status: task?.status ?? 'Todo',
      priority: task?.priority ?? 'Medium',
    },
  });

  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="task-dialog-title" className="text-lg font-semibold">
          {task ? 'Edit task' : 'New task'}
        </h2>

        <form
          className="mt-4 space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) =>
            onSubmit({
              entryDate: values.entryDate,
              title: values.title,
              description: values.description?.trim() ? values.description.trim() : null,
              category: values.category,
              status: values.status,
              priority: values.priority,
            })
          )}
        >
          <FormField
            label="Date"
            htmlFor="entryDate"
            error={form.formState.errors.entryDate?.message}
          >
            <input
              id="entryDate"
              type="date"
              className={inputClass}
              {...form.register('entryDate')}
            />
          </FormField>

          <FormField label="Title" htmlFor="title" error={form.formState.errors.title?.message}>
            <input id="title" className={inputClass} {...form.register('title')} />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            error={form.formState.errors.description?.message}
          >
            <textarea
              id="description"
              rows={3}
              className={inputClass}
              {...form.register('description')}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Category" htmlFor="category">
              <select id="category" className={inputClass} {...form.register('category')}>
                {taskCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Status" htmlFor="status">
              <select id="status" className={inputClass} {...form.register('status')}>
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Priority" htmlFor="priority">
              <select id="priority" className={inputClass} {...form.register('priority')}>
                {taskPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {error ? (
            <div role="alert" className="space-y-1 text-sm text-red-600">
              {serverMessages(error).map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className={buttonClass} disabled={pending}>
              {pending ? 'Saving…' : 'Save task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
