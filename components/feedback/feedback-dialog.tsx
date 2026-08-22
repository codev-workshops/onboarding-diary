'use client';

import { FeedbackType, FeedbackVisibility } from '@prisma/client';

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
import type { FeedbackDto } from '@/src/modules/feedback/dto';

export function FeedbackDialog({
  feedback,
  onClose,
  onSaved,
}: {
  feedback?: FeedbackDto;
  onClose: () => void;
  onSaved: (saved: SavedEntry | null) => void;
}) {
  const { saving, message, fieldErrors, send } = useEntrySubmit('/api/v1/feedback', feedback?.id, onSaved);

  function submit(form: FormData) {
    void send({
      entry_date: String(form.get('entry_date') ?? ''),
      subject: String(form.get('subject') ?? ''),
      type: String(form.get('type') ?? ''),
      details: String(form.get('details') ?? ''),
      visibility: String(form.get('visibility') ?? ''),
      ...(feedback ? { expected_version: feedback.version } : {}),
    });
  }

  return (
    <EntryDialog
      title={feedback ? 'Edit feedback' : 'New feedback'}
      saveLabel="Save feedback"
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
          defaultValue={feedback?.entry_date ?? new Date().toISOString().slice(0, 10)}
        />
      </DialogField>

      <DialogField name="subject" label="Subject" errors={fieldErrors}>
        <Input
          id={dialogId('subject')}
          name="subject"
          required
          minLength={3}
          maxLength={140}
          defaultValue={feedback?.subject}
        />
      </DialogField>

      <DialogField name="details" label="Details" errors={fieldErrors}>
        <textarea
          id={dialogId('details')}
          name="details"
          rows={5}
          required
          minLength={10}
          maxLength={5000}
          defaultValue={feedback?.details ?? ''}
          className={textareaClass}
        />
      </DialogField>

      <div className="grid gap-4 sm:grid-cols-2">
        <DialogChoice
          name="type"
          label="Type"
          values={Object.values(FeedbackType)}
          current={feedback?.type ?? 'SUGGESTION'}
          errors={fieldErrors}
        />
        {/*
          Admin-only feedback is invisible to the manager, which is the point:
          a concern about your manager is unusable if they can read it.
        */}
        <DialogChoice
          name="visibility"
          label="Visible to"
          values={Object.values(FeedbackVisibility)}
          current={feedback?.visibility ?? 'MANAGER_VISIBLE'}
          errors={fieldErrors}
        />
      </div>
    </EntryDialog>
  );
}
