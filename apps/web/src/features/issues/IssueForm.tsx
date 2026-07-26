/**
 * Issue create/edit form (T-142). Moving an issue to Resolved or Won't Fix surfaces the
 * resolution notes field and marks it as expected, so a closed issue records how it ended
 * (FR-I7).
 */

import {
  CLOSED_ISSUE_STATUSES,
  createIssueBody,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  todayUtc,
  type IssueEntryDto,
} from '@onboarding-diary/shared';
import type { ReactNode } from 'react';

import { Field } from '../../components/ui/Field.js';
import { DateInput, Input, Textarea } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { applyServerErrors, useZodForm } from '../../lib/forms.js';
import { EntryFormCard } from '../entries/EntryFormCard.js';
import { enumOptions } from '../entries/enumOptions.js';
import { useSaveEntry } from '../entries/useEntries.js';

const FIELDS = [
  'entryDate',
  'title',
  'description',
  'severity',
  'status',
  'resolutionNotes',
] as const;

export function IssueForm({
  issue,
  onDone,
}: {
  issue: IssueEntryDto | null;
  onDone: () => void;
}): ReactNode {
  const save = useSaveEntry('issues');
  const form = useZodForm(createIssueBody, {
    defaultValues: {
      entryDate: issue?.entryDate ?? todayUtc(),
      title: issue?.title ?? '',
      description: issue?.description ?? '',
      severity: issue?.severity ?? 'MEDIUM',
      status: issue?.status ?? 'OPEN',
      resolutionNotes: issue?.resolutionNotes ?? '',
    },
  });

  const status = form.watch('status') ?? 'OPEN';
  const isClosing = CLOSED_ISSUE_STATUSES.includes(status);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ ...(issue === null ? {} : { id: issue.id }), body: values });
      onDone();
    } catch (error) {
      if (!applyServerErrors(error, form.setError, [...FIELDS])) throw error;
    }
  });

  return (
    <EntryFormCard
      mode={issue === null ? 'create' : 'edit'}
      noun="issue"
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
      <Field label="Severity" error={form.formState.errors.severity?.message}>
        {(ids) => (
          <Select
            id={ids.id}
            options={enumOptions(ISSUE_SEVERITIES, ISSUE_SEVERITY_LABELS)}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('severity')}
          />
        )}
      </Field>
      <Field label="Status" error={form.formState.errors.status?.message}>
        {(ids) => (
          <Select
            id={ids.id}
            options={enumOptions(ISSUE_STATUSES, ISSUE_STATUS_LABELS)}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('status')}
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
      {isClosing ? (
        <Field
          label="Resolution notes"
          hint={`Explain how this issue ended now that it is ${ISSUE_STATUS_LABELS[status]}.`}
          error={form.formState.errors.resolutionNotes?.message}
        >
          {(ids) => (
            <Textarea
              id={ids.id}
              className="border-sky-400 ring-2 ring-sky-100"
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('resolutionNotes')}
            />
          )}
        </Field>
      ) : null}
    </EntryFormCard>
  );
}
