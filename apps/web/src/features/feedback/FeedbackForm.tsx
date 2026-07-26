import {
  createFeedbackBody,
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  todayUtc,
  type FeedbackNoteDto,
} from '@onboarding-diary/shared';
import type { ReactNode } from 'react';

import { Field } from '../../components/ui/Field.js';
import { DateInput, Input, Textarea } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { applyServerErrors, useZodForm } from '../../lib/forms.js';
import { EntryFormCard } from '../entries/EntryFormCard.js';
import { enumOptions } from '../entries/enumOptions.js';
import { useSaveEntry } from '../entries/useEntries.js';

const FIELDS = ['entryDate', 'subject', 'type', 'details'] as const;

export function FeedbackForm({
  feedback,
  onDone,
}: {
  feedback: FeedbackNoteDto | null;
  onDone: () => void;
}): ReactNode {
  const save = useSaveEntry('feedback');
  const form = useZodForm(createFeedbackBody, {
    defaultValues: {
      entryDate: feedback?.entryDate ?? todayUtc(),
      subject: feedback?.subject ?? '',
      type: feedback?.type ?? 'POSITIVE',
      details: feedback?.details ?? '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        ...(feedback === null ? {} : { id: feedback.id }),
        body: values,
      });
      onDone();
    } catch (error) {
      if (!applyServerErrors(error, form.setError, [...FIELDS])) throw error;
    }
  });

  return (
    <EntryFormCard
      mode={feedback === null ? 'create' : 'edit'}
      noun="feedback note"
      isSaving={save.isPending}
      rootError={form.formState.errors.root?.message}
      onSubmit={onSubmit}
      onCancel={onDone}
    >
      <Field label="Subject" error={form.formState.errors.subject?.message} required>
        {(ids) => (
          <Input
            id={ids.id}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('subject')}
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
      <Field label="Type" error={form.formState.errors.type?.message}>
        {(ids) => (
          <Select
            id={ids.id}
            options={enumOptions(FEEDBACK_TYPES, FEEDBACK_TYPE_LABELS)}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('type')}
          />
        )}
      </Field>
      <Field label="Details" error={form.formState.errors.details?.message}>
        {(ids) => (
          <Textarea
            id={ids.id}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('details')}
          />
        )}
      </Field>
    </EntryFormCard>
  );
}
