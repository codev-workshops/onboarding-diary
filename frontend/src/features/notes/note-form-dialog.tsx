import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage } from '../../shared/api/api-client';
import { todayIso, toIsoDate } from '../../shared/lib/format';
import type { NoteEntry } from '../../shared/types';
import { noteSchema, type NoteFormValues } from './schema';

interface NoteFormDialogProps {
  open: boolean;
  entry: NoteEntry | null;
  saving: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (values: NoteFormValues) => void;
}

const emptyValues: NoteFormValues = { date: todayIso(), title: '', content: '', tags: [] };

export function NoteFormDialog({ open, entry, saving, error, onClose, onSubmit }: NoteFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteFormValues>({ resolver: zodResolver(noteSchema), defaultValues: emptyValues });

  useEffect(() => {
    reset(
      entry
        ? {
            date: toIsoDate(entry.date),
            title: entry.title,
            content: entry.content ?? '',
            tags: entry.tags ?? [],
          }
        : emptyValues,
    );
  }, [entry, open, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{entry ? 'Edit note' : 'New note'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error ? <Alert severity="error">{getErrorMessage(error)}</Alert> : null}
            <TextField
              label="Date"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('date')}
              error={Boolean(errors.date)}
              helperText={errors.date?.message}
            />
            <TextField
              label="Title"
              {...register('title')}
              error={Boolean(errors.title)}
              helperText={errors.title?.message}
            />
            <TextField
              label="Content"
              multiline
              minRows={5}
              {...register('content')}
              error={Boolean(errors.content)}
              helperText={errors.content?.message}
            />
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={[] as string[]}
                  value={field.value}
                  onChange={(_, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Press enter to add"
                      error={Boolean(errors.tags)}
                      helperText={errors.tags?.message}
                    />
                  )}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
