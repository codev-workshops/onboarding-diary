/**
 * Task create/edit form (T-132). Validation comes from the shared schema, so the
 * "no future dates" rule is enforced client-side before the request is made (FR-T9).
 */

import {
  createTaskBody,
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  todayUtc,
  type TaskEntryDto,
} from '@onboarding-diary/shared';
import type { ReactNode } from 'react';

import { Field } from '../../components/ui/Field.js';
import { DateInput, Input, Textarea } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { applyServerErrors, useZodForm } from '../../lib/forms.js';
import { EntryFormCard } from '../entries/EntryFormCard.js';
import { enumOptions } from '../entries/enumOptions.js';
import { useSaveEntry } from '../entries/useEntries.js';

const FIELDS = ['entryDate', 'title', 'description', 'category', 'status', 'priority'] as const;

export function TaskForm({
  task,
  onDone,
}: {
  task: TaskEntryDto | null;
  onDone: () => void;
}): ReactNode {
  const save = useSaveEntry('tasks');
  const form = useZodForm(createTaskBody, {
    defaultValues: {
      entryDate: task?.entryDate ?? todayUtc(),
      title: task?.title ?? '',
      description: task?.description ?? '',
      category: task?.category ?? 'OTHER',
      status: task?.status ?? 'NOT_STARTED',
      priority: task?.priority ?? 'MEDIUM',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ ...(task === null ? {} : { id: task.id }), body: values });
      onDone();
    } catch (error) {
      if (!applyServerErrors(error, form.setError, [...FIELDS])) throw error;
    }
  });

  return (
    <EntryFormCard
      mode={task === null ? 'create' : 'edit'}
      noun="task"
      isSaving={save.isPending}
      rootError={form.formState.errors.root?.message}
      onSubmit={onSubmit}
      onCancel={onDone}
    >
      <Field label="Title" error={form.formState.errors.title?.message} required>
        {(ids) => (
          <Input
            id={ids.id}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('title')}
          />
        )}
      </Field>
      <Field label="Date" error={form.formState.errors.entryDate?.message} required>
        {(ids) => (
          <DateInput
            id={ids.id}
            max={todayUtc()}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('entryDate')}
          />
        )}
      </Field>
      <Field label="Category" error={form.formState.errors.category?.message}>
        {(ids) => (
          <Select
            id={ids.id}
            options={enumOptions(TASK_CATEGORIES, TASK_CATEGORY_LABELS)}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('category')}
          />
        )}
      </Field>
      <Field label="Status" error={form.formState.errors.status?.message}>
        {(ids) => (
          <Select
            id={ids.id}
            options={enumOptions(TASK_STATUSES, TASK_STATUS_LABELS)}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('status')}
          />
        )}
      </Field>
      <Field label="Priority" error={form.formState.errors.priority?.message}>
        {(ids) => (
          <Select
            id={ids.id}
            options={enumOptions(TASK_PRIORITIES, TASK_PRIORITY_LABELS)}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('priority')}
          />
        )}
      </Field>
      <Field label="Description" error={form.formState.errors.description?.message}>
        {(ids) => (
          <Textarea
            id={ids.id}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('description')}
          />
        )}
      </Field>
    </EntryFormCard>
  );
}
