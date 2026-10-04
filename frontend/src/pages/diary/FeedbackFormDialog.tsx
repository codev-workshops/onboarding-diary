import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { createEntry, updateEntry } from '../../api/diary';
import { FEEDBACK_TYPES, type Feedback, type FeedbackRequest } from '../../api/diaryTypes';
import { applyServerErrors, isConflict } from '../../api/serverErrors';
import { useAuth } from '../../auth/useAuth';
import { EntryDateField } from '../../components/diary/EntryDateField';
import { EntryDialog } from '../../components/diary/EntryDialog';
import { EnumSelectField } from '../../components/diary/EnumSelectField';
import { todayIso } from '../../utils/dates';
import { feedbackSchema, type FeedbackValues } from '../../validation/diarySchemas';

const FIELDS = ['entryDate', 'subject', 'type', 'details'];

function toValues(feedback: Feedback | null): FeedbackValues {
  return {
    entryDate: feedback?.entryDate ?? todayIso(),
    subject: feedback?.subject ?? '',
    type: feedback?.type ?? ('' as FeedbackValues['type']),
    details: feedback?.details ?? '',
  };
}

interface Props {
  open: boolean;
  feedback: Feedback | null;
  onClose: () => void;
  onSaved: (created: boolean) => void;
  onConflict: () => void;
}

export function FeedbackFormDialog({ open, feedback, onClose, onSaved, onConflict }: Props) {
  const { user } = useAuth();
  const schema = useMemo(() => feedbackSchema(user?.profile.startDate ?? todayIso()), [user]);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackValues>({ resolver: zodResolver(schema), defaultValues: toValues(feedback) });

  useEffect(() => {
    if (open) {
      reset(toValues(feedback));
      setServerError(null);
    }
  }, [open, feedback, reset]);

  const onSubmit = async (values: FeedbackValues) => {
    setServerError(null);
    try {
      if (feedback) {
        await updateEntry<Feedback, FeedbackRequest>('feedback', feedback.id, {
          ...values,
          version: feedback.version,
        });
      } else {
        await createEntry<Feedback, FeedbackRequest>('feedback', values);
      }
      onSaved(!feedback);
    } catch (error) {
      setServerError(applyServerErrors(error, setError, FIELDS, 'Could not save feedback'));
      if (isConflict(error)) onConflict();
    }
  };

  return (
    <EntryDialog
      open={open}
      title={feedback ? 'Edit feedback' : 'New feedback'}
      error={serverError}
      submitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <EntryDateField registration={register('entryDate')} error={errors.entryDate} />
      <TextField
        label="Subject"
        required
        {...register('subject')}
        error={!!errors.subject}
        helperText={errors.subject?.message}
      />
      <EnumSelectField
        control={control}
        name="type"
        label="Type"
        options={FEEDBACK_TYPES}
        required
      />
      <TextField
        label="Details"
        required
        multiline
        minRows={4}
        {...register('details')}
        error={!!errors.details}
        helperText={errors.details?.message}
      />
    </EntryDialog>
  );
}
