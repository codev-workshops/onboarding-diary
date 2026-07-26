/**
 * Note create/edit form (T-153). The tag input normalises as you type and the shared schema
 * normalises again on submit, so what is displayed is what is stored (FR-N2).
 */

import { createNoteBody, todayUtc, type NoteDto } from '@onboarding-diary/shared';
import { Controller } from 'react-hook-form';
import type { ReactNode } from 'react';

import { Field } from '../../components/ui/Field.js';
import { DateInput, Input, Textarea } from '../../components/ui/Input.js';
import { TagInput } from '../../components/ui/TagInput.js';
import { applyServerErrors, useZodForm } from '../../lib/forms.js';
import { EntryFormCard } from '../entries/EntryFormCard.js';
import { useSaveEntry } from '../entries/useEntries.js';

const FIELDS = ['entryDate', 'title', 'content', 'tags'] as const;

export function NoteForm({
  note,
  onDone,
}: {
  note: NoteDto | null;
  onDone: () => void;
}): ReactNode {
  const save = useSaveEntry('notes');
  const form = useZodForm(createNoteBody, {
    defaultValues: {
      entryDate: note?.entryDate ?? todayUtc(),
      title: note?.title ?? '',
      content: note?.content ?? '',
      tags: note?.tags ?? [],
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ ...(note === null ? {} : { id: note.id }), body: values });
      onDone();
    } catch (error) {
      if (!applyServerErrors(error, form.setError, [...FIELDS])) throw error;
    }
  });

  return (
    <EntryFormCard
      mode={note === null ? 'create' : 'edit'}
      noun="note"
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
      <Field
        label="Tags"
        hint="Lowercased and de-duplicated when saved."
        error={form.formState.errors.tags?.message}
      >
        {(ids) => (
          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              <TagInput
                id={ids.id}
                value={field.value ?? []}
                onChange={field.onChange}
                aria-describedby={ids.describedBy}
                aria-invalid={ids.invalid}
              />
            )}
          />
        )}
      </Field>
      <Field label="Content" error={form.formState.errors.content?.message}>
        {(ids) => (
          <Textarea
            id={ids.id}
            rows={6}
            aria-describedby={ids.describedBy}
            aria-invalid={ids.invalid}
            {...form.register('content')}
          />
        )}
      </Field>
    </EntryFormCard>
  );
}
