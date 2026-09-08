import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Note, NotePayload } from '../../api/diary';
import { parseTags } from '../../api/diary';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { Modal, ServerErrors } from '../../components/Modal';
import { zodResolver } from '../../lib/zod-resolver';

const noteSchema = z.object({
  entryDate: z.string().min(1, 'Pick a date.'),
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(120),
  content: z.string().trim().min(3, 'Write at least 3 characters.').max(10000),
  tags: z
    .string()
    .optional()
    .refine((value) => parseTags(value ?? '').length <= 10, 'Use at most 10 tags.')
    .refine(
      (value) => parseTags(value ?? '').every((tag) => tag.length <= 40),
      'Each tag must be 40 characters or fewer.'
    ),
});

type NoteForm = z.infer<typeof noteSchema>;

const today = () => new Date().toISOString().slice(0, 10);

export function NoteFormDialog({
  note,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  note: Note | null;
  pending: boolean;
  error: unknown;
  onSubmit: (payload: NotePayload) => void;
  onClose: () => void;
}) {
  const form = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      entryDate: note?.entryDate ?? today(),
      title: note?.title ?? '',
      content: note?.content ?? '',
      tags: note?.tags.join(', ') ?? '',
    },
  });

  const previewTags = parseTags(form.watch('tags') ?? '');

  return (
    <Modal title={note ? 'Edit note' : 'New note'} titleId="note-dialog-title">
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            entryDate: values.entryDate,
            title: values.title,
            content: values.content,
            tags: parseTags(values.tags ?? ''),
          })
        )}
      >
        <FormField
          label="Date"
          htmlFor="note-entryDate"
          error={form.formState.errors.entryDate?.message}
        >
          <input
            id="note-entryDate"
            type="date"
            className={inputClass}
            {...form.register('entryDate')}
          />
        </FormField>

        <FormField label="Title" htmlFor="note-title" error={form.formState.errors.title?.message}>
          <input id="note-title" className={inputClass} {...form.register('title')} />
        </FormField>

        <FormField
          label="Content"
          htmlFor="note-content"
          error={form.formState.errors.content?.message}
        >
          <textarea
            id="note-content"
            rows={5}
            className={inputClass}
            {...form.register('content')}
          />
        </FormField>

        <FormField
          label="Tags (comma separated)"
          htmlFor="note-tags"
          error={form.formState.errors.tags?.message}
        >
          <input id="note-tags" className={inputClass} {...form.register('tags')} />
        </FormField>

        {previewTags.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Tag preview">
            {previewTags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <ServerErrors error={error} />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className={buttonClass} disabled={pending}>
            {pending ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
