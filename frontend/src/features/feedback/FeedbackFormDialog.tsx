import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Feedback, FeedbackPayload } from '../../api/diary';
import { feedbackTypes } from '../../api/diary';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { Modal, ServerErrors } from '../../components/Modal';
import { zodResolver } from '../../lib/zod-resolver';

const feedbackSchema = z.object({
  entryDate: z.string().min(1, 'Pick a date.'),
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(120),
  message: z.string().trim().min(3, 'Say a little more — at least 3 characters.').max(5000),
  type: z.enum(feedbackTypes),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

const today = () => new Date().toISOString().slice(0, 10);

export function FeedbackFormDialog({
  feedback,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  feedback: Feedback | null;
  pending: boolean;
  error: unknown;
  onSubmit: (payload: FeedbackPayload) => void;
  onClose: () => void;
}) {
  const form = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      entryDate: feedback?.entryDate ?? today(),
      title: feedback?.title ?? '',
      message: feedback?.message ?? '',
      type: feedback?.type ?? 'Suggestion',
    },
  });

  return (
    <Modal title={feedback ? 'Edit feedback' : 'New feedback'} titleId="feedback-dialog-title">
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
      >
        <FormField
          label="Date"
          htmlFor="feedback-entryDate"
          error={form.formState.errors.entryDate?.message}
        >
          <input
            id="feedback-entryDate"
            type="date"
            className={inputClass}
            {...form.register('entryDate')}
          />
        </FormField>

        <FormField
          label="Title"
          htmlFor="feedback-title"
          error={form.formState.errors.title?.message}
        >
          <input id="feedback-title" className={inputClass} {...form.register('title')} />
        </FormField>

        <FormField
          label="Message"
          htmlFor="feedback-message"
          error={form.formState.errors.message?.message}
        >
          <textarea
            id="feedback-message"
            rows={4}
            className={inputClass}
            {...form.register('message')}
          />
        </FormField>

        <FormField label="Type" htmlFor="feedback-type">
          <select id="feedback-type" className={inputClass} {...form.register('type')}>
            {feedbackTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>

        <p className="text-xs text-slate-500">
          Feedback is always attributed to you; there is no anonymous option.
        </p>

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
            {pending ? 'Saving…' : 'Save feedback'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
