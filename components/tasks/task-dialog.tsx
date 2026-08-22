'use client';

import { PriorityLevel, TaskCategory, TaskStatus } from '@prisma/client';

import {
  DialogChoice,
  DialogField,
  EntryDialog,
  dialogId,
  textareaClass,
  useEntrySubmit,
} from '@/components/entries/form';
import { Input } from '@/components/ui/input';
import type { TaskDto } from '@/src/modules/tasks/dto';

/**
 * Create and edit share one form: the fields are identical and an edit is a
 * PATCH of the same shape.
 */
export function TaskDialog({
  task,
  onClose,
  onSaved,
}: {
  task?: TaskDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { saving, message, fieldErrors, send } = useEntrySubmit('/api/v1/tasks', task?.id, onSaved);

  function submit(form: FormData) {
    void send({
      entry_date: String(form.get('entry_date') ?? ''),
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? '').trim() || null,
      category: String(form.get('category') ?? ''),
      status: String(form.get('status') ?? ''),
      priority: String(form.get('priority') ?? ''),
      // Sent only on edit: a create has nothing to conflict with.
      ...(task ? { expected_version: task.version } : {}),
    });
  }

  return (
    <EntryDialog
      title={task ? 'Edit task' : 'New task'}
      saveLabel="Save task"
      saving={saving}
      message={message}
      onClose={onClose}
      onSubmit={submit}
    >
      <DialogField name="entry_date" label="Date" errors={fieldErrors}>
        <Input
          id={dialogId('entry_date')}
          name="entry_date"
          type="date"
          required
          defaultValue={task?.entry_date ?? new Date().toISOString().slice(0, 10)}
        />
      </DialogField>

      <DialogField name="title" label="Title" errors={fieldErrors}>
        <Input
          id={dialogId('title')}
          name="title"
          required
          minLength={3}
          maxLength={140}
          defaultValue={task?.title}
        />
      </DialogField>

      <DialogField name="description" label="Description" errors={fieldErrors}>
        <textarea
          id={dialogId('description')}
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={task?.description ?? ''}
          className={textareaClass}
        />
      </DialogField>

      <div className="grid gap-4 sm:grid-cols-3">
        <DialogChoice
          name="category"
          label="Category"
          values={Object.values(TaskCategory)}
          current={task?.category ?? 'OTHER'}
          errors={fieldErrors}
        />
        <DialogChoice
          name="status"
          label="Status"
          values={Object.values(TaskStatus)}
          current={task?.status ?? 'TODO'}
          errors={fieldErrors}
        />
        <DialogChoice
          name="priority"
          label="Priority"
          values={Object.values(PriorityLevel)}
          current={task?.priority ?? 'MEDIUM'}
          errors={fieldErrors}
        />
      </div>
    </EntryDialog>
  );
}
