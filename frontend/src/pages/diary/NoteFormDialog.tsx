import { zodResolver } from '@hookform/resolvers/zod';
import {
  Autocomplete,
  Box,
  Chip,
  FormControlLabel,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Markdown from 'react-markdown';
import { createEntry, fetchNoteTags, updateEntry } from '../../api/diary';
import type { Note, NoteRequest } from '../../api/diaryTypes';
import { applyServerErrors, isConflict } from '../../api/serverErrors';
import { useAuth } from '../../auth/useAuth';
import { EntryDateField } from '../../components/diary/EntryDateField';
import { EntryDialog } from '../../components/diary/EntryDialog';
import { todayIso } from '../../utils/dates';
import { MAX_TAGS, noteSchema, type NoteValues } from '../../validation/diarySchemas';

const FIELDS = ['entryDate', 'title', 'content', 'tags', 'shared'];

function toValues(note: Note | null): NoteValues {
  return {
    entryDate: note?.entryDate ?? todayIso(),
    title: note?.title ?? '',
    content: note?.content ?? '',
    tags: note?.tags ?? [],
    shared: note?.shared ?? false,
  };
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

interface Props {
  open: boolean;
  note: Note | null;
  onClose: () => void;
  onSaved: (created: boolean) => void;
  onConflict: () => void;
}

export function NoteFormDialog({ open, note, onClose, onSaved, onConflict }: Props) {
  const { user } = useAuth();
  const schema = useMemo(() => noteSchema(user?.profile.startDate ?? todayIso()), [user]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NoteValues>({ resolver: zodResolver(schema), defaultValues: toValues(note) });
  const tagSuggestions = useQuery({
    queryKey: ['notes', 'tags'],
    queryFn: fetchNoteTags,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      reset(toValues(note));
      setServerError(null);
      setTab('write');
    }
  }, [open, note, reset]);

  const onSubmit = async (values: NoteValues) => {
    setServerError(null);
    try {
      if (note) {
        await updateEntry<Note, NoteRequest>('notes', note.id, {
          ...values,
          version: note.version,
        });
      } else {
        await createEntry<Note, NoteRequest>('notes', values);
      }
      onSaved(!note);
    } catch (error) {
      setServerError(applyServerErrors(error, setError, FIELDS, 'Could not save note'));
      if (isConflict(error)) onConflict();
    }
  };

  const tagError = Array.isArray(errors.tags)
    ? errors.tags.find((error) => error?.message)?.message
    : errors.tags?.message;

  return (
    <EntryDialog
      open={open}
      title={note ? 'Edit note' : 'New note'}
      error={serverError}
      submitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <EntryDateField registration={register('entryDate')} error={errors.entryDate} />
      <TextField
        label="Title"
        required
        {...register('title')}
        error={!!errors.title}
        helperText={errors.title?.message}
      />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 1 }}>
        <Tab value="write" label="Write" />
        <Tab value="preview" label="Preview" />
      </Tabs>
      {tab === 'write' ? (
        <TextField
          label="Content"
          required
          multiline
          minRows={6}
          {...register('content')}
          error={!!errors.content}
          helperText={errors.content?.message ?? 'Markdown is supported'}
        />
      ) : (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, minHeight: 160, overflowWrap: 'anywhere' }}>
          {watch('content').trim() ? (
            <Box sx={{ '& > :first-of-type': { mt: 0 } }}>
              <Markdown>{watch('content')}</Markdown>
            </Box>
          ) : (
            <Typography color="text.secondary">Nothing to preview</Typography>
          )}
        </Paper>
      )}
      <Controller
        control={control}
        name="tags"
        render={({ field }) => (
          <Autocomplete
            multiple
            freeSolo
            options={tagSuggestions.data ?? []}
            value={field.value}
            onChange={(_, value) => field.onChange(normalizeTags(value as string[]))}
            renderTags={(value, getTagProps) =>
              value.map((tag, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={key} size="small" label={tag} {...tagProps} />;
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                error={!!tagError}
                helperText={tagError ?? `Press Enter to add a tag (up to ${MAX_TAGS})`}
              />
            )}
          />
        )}
      />
      <Controller
        control={control}
        name="shared"
        render={({ field }) => (
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Switch
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            }
            label="Share with my manager"
          />
        )}
      />
    </EntryDialog>
  );
}
