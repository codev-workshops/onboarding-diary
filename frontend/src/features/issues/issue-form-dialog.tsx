import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage } from '../../shared/api/api-client';
import { humanize, todayIso, toIsoDate } from '../../shared/lib/format';
import { issueSeverities, issueStatuses, type IssueEntry } from '../../shared/types';
import { issueSchema, type IssueFormValues } from './schema';

interface IssueFormDialogProps {
  open: boolean;
  entry: IssueEntry | null;
  saving: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (values: IssueFormValues) => void;
}

const emptyValues: IssueFormValues = {
  date: todayIso(),
  title: '',
  description: '',
  severity: 'Medium',
  status: 'Open',
  resolutionNotes: '',
};

export function IssueFormDialog({ open, entry, saving, error, onClose, onSubmit }: IssueFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IssueFormValues>({ resolver: zodResolver(issueSchema), defaultValues: emptyValues });

  useEffect(() => {
    reset(
      entry
        ? {
            date: toIsoDate(entry.date),
            title: entry.title,
            description: entry.description ?? '',
            severity: entry.severity,
            status: entry.status,
            resolutionNotes: entry.resolutionNotes ?? '',
          }
        : emptyValues,
    );
  }, [entry, open, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{entry ? 'Edit issue' : 'New issue'}</DialogTitle>
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
            <TextField label="Description" multiline minRows={3} {...register('description')} />
            <Controller
              control={control}
              name="severity"
              render={({ field }) => (
                <TextField select label="Severity" {...field}>
                  {issueSeverities.map((option) => (
                    <MenuItem key={option} value={option}>
                      {humanize(option)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <TextField select label="Status" {...field}>
                  {issueStatuses.map((option) => (
                    <MenuItem key={option} value={option}>
                      {humanize(option)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField label="Resolution notes" multiline minRows={2} {...register('resolutionNotes')} />
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
