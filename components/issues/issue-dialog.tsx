'use client';

import { IssueSeverity, IssueStatus } from '@prisma/client';

import {
  DialogChoice,
  DialogField,
  EntryDialog,
  dialogId,
  textareaClass,
  useEntrySubmit,
  type SavedEntry,
} from '@/components/entries/form';
import { Input } from '@/components/ui/input';
import type { IssueDto } from '@/src/modules/issues/dto';

/**
 * A manager editing a report's issue may only send `status` and
 * `resolution_notes` — sending more is refused server-side with 403
 * FIELD_NOT_PERMITTED, so the form omits the rest rather than inviting the
 * rejection.
 */
export function IssueDialog({
  issue,
  restricted,
  onClose,
  onSaved,
}: {
  issue?: IssueDto;
  restricted?: boolean;
  onClose: () => void;
  onSaved: (saved: SavedEntry | null) => void;
}) {
  const { saving, message, fieldErrors, send } = useEntrySubmit('/api/v1/issues', issue?.id, onSaved);

  function submit(form: FormData) {
    const resolutionNotes = String(form.get('resolution_notes') ?? '').trim();

    void send({
      status: String(form.get('status') ?? ''),
      resolution_notes: resolutionNotes || null,
      ...(restricted
        ? {}
        : {
            entry_date: String(form.get('entry_date') ?? ''),
            title: String(form.get('title') ?? ''),
            description: String(form.get('description') ?? ''),
            severity: String(form.get('severity') ?? ''),
          }),
      ...(issue ? { expected_version: issue.version } : {}),
    });
  }

  return (
    <EntryDialog
      title={issue ? (restricted ? 'Update issue status' : 'Edit issue') : 'New issue'}
      saveLabel="Save issue"
      saving={saving}
      message={message}
      onClose={onClose}
      onSubmit={submit}
    >
      {restricted ? null : (
        <>
          <DialogField name="entry_date" label="Date" errors={fieldErrors}>
            <Input
              id={dialogId('entry_date')}
              name="entry_date"
              type="date"
              required
              defaultValue={issue?.entry_date ?? new Date().toISOString().slice(0, 10)}
            />
          </DialogField>

          <DialogField name="title" label="Title" errors={fieldErrors}>
            <Input
              id={dialogId('title')}
              name="title"
              required
              minLength={3}
              maxLength={140}
              defaultValue={issue?.title}
            />
          </DialogField>

          <DialogField name="description" label="Description" errors={fieldErrors}>
            <textarea
              id={dialogId('description')}
              name="description"
              rows={4}
              required
              minLength={10}
              maxLength={5000}
              defaultValue={issue?.description ?? ''}
              className={textareaClass}
            />
          </DialogField>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {restricted ? null : (
          <DialogChoice
            name="severity"
            label="Severity"
            values={Object.values(IssueSeverity)}
            current={issue?.severity ?? 'MEDIUM'}
            errors={fieldErrors}
          />
        )}
        <DialogChoice
          name="status"
          label="Status"
          values={Object.values(IssueStatus)}
          current={issue?.status ?? 'OPEN'}
          errors={fieldErrors}
        />
      </div>

      <DialogField name="resolution_notes" label="Resolution notes" errors={fieldErrors}>
        <textarea
          id={dialogId('resolution_notes')}
          name="resolution_notes"
          rows={3}
          maxLength={5000}
          defaultValue={issue?.resolution_notes ?? ''}
          placeholder="Required to resolve or close (10 characters or more)"
          className={textareaClass}
        />
      </DialogField>
    </EntryDialog>
  );
}
