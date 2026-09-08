import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Issue, IssueUpdatePayload } from '../../api/diary';
import {
  issueSeverities,
  issueStatusLabels,
  issueStatuses,
  nextStatuses,
  requiresResolutionNotes,
} from '../../api/diary';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { Modal, ServerErrors } from '../../components/Modal';
import { zodResolver } from '../../lib/zod-resolver';

const issueSchema = z
  .object({
    entryDate: z.string().min(1, 'Pick a date.'),
    title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(120),
    description: z.string().max(5000).optional(),
    severity: z.enum(issueSeverities),
    status: z.enum(issueStatuses),
    resolutionNotes: z.string().max(5000).optional(),
  })
  .refine((values) => !requiresResolutionNotes(values.status) || !!values.resolutionNotes?.trim(), {
    path: ['resolutionNotes'],
    message: 'Resolution notes are required when an issue is resolved or closed.',
  });

type IssueForm = z.infer<typeof issueSchema>;

const today = () => new Date().toISOString().slice(0, 10);

export function IssueFormDialog({
  issue,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  issue: Issue | null;
  pending: boolean;
  error: unknown;
  onSubmit: (payload: IssueUpdatePayload) => void;
  onClose: () => void;
}) {
  const form = useForm<IssueForm>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      entryDate: issue?.entryDate ?? today(),
      title: issue?.title ?? '',
      description: issue?.description ?? '',
      severity: issue?.severity ?? 'Medium',
      status: issue?.status ?? 'Open',
      resolutionNotes: issue?.resolutionNotes ?? '',
    },
  });

  const statusOptions = issue ? nextStatuses(issue.status) : ['Open' as const];
  const showResolution = requiresResolutionNotes(form.watch('status'));

  return (
    <Modal title={issue ? 'Edit issue' : 'New issue'} titleId="issue-dialog-title">
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            entryDate: values.entryDate,
            title: values.title,
            description: values.description?.trim() ? values.description.trim() : null,
            severity: values.severity,
            status: values.status,
            resolutionNotes: values.resolutionNotes?.trim() ? values.resolutionNotes.trim() : null,
          })
        )}
      >
        <FormField
          label="Date"
          htmlFor="issue-entryDate"
          error={form.formState.errors.entryDate?.message}
        >
          <input
            id="issue-entryDate"
            type="date"
            className={inputClass}
            {...form.register('entryDate')}
          />
        </FormField>

        <FormField label="Title" htmlFor="issue-title" error={form.formState.errors.title?.message}>
          <input id="issue-title" className={inputClass} {...form.register('title')} />
        </FormField>

        <FormField
          label="Description"
          htmlFor="issue-description"
          error={form.formState.errors.description?.message}
        >
          <textarea
            id="issue-description"
            rows={3}
            className={inputClass}
            {...form.register('description')}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Severity" htmlFor="issue-severity">
            <select id="issue-severity" className={inputClass} {...form.register('severity')}>
              {issueSeverities.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Status" htmlFor="issue-status">
            <select
              id="issue-status"
              className={inputClass}
              disabled={!issue}
              {...form.register('status')}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {issueStatusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {showResolution ? (
          <FormField
            label="Resolution notes"
            htmlFor="issue-resolutionNotes"
            error={form.formState.errors.resolutionNotes?.message}
          >
            <textarea
              id="issue-resolutionNotes"
              rows={3}
              className={inputClass}
              {...form.register('resolutionNotes')}
            />
          </FormField>
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
            {pending ? 'Saving…' : 'Save issue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
