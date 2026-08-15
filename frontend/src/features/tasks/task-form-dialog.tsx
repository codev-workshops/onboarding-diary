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
import { taskCategories, taskPriorities, taskStatuses, type TaskEntry } from '../../shared/types';
import { taskSchema, type TaskFormValues } from './schema';

interface TaskFormDialogProps {
  open: boolean;
  entry: TaskEntry | null;
  saving: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}

const emptyValues: TaskFormValues = {
  date: todayIso(),
  title: '',
  description: '',
  category: 'Training',
  status: 'NotStarted',
  priority: 'Medium',
};

export function TaskFormDialog({ open, entry, saving, error, onClose, onSubmit }: TaskFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema), defaultValues: emptyValues });

  useEffect(() => {
    reset(
      entry
        ? {
            date: toIsoDate(entry.date),
            title: entry.title,
            description: entry.description ?? '',
            category: entry.category,
            status: entry.status,
            priority: entry.priority,
          }
        : emptyValues,
    );
  }, [entry, open, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{entry ? 'Edit task' : 'New task'}</DialogTitle>
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
              label="Description"
              multiline
              minRows={3}
              {...register('description')}
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
            />
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <TextField select label="Category" {...field}>
                  {taskCategories.map((option) => (
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
                  {taskStatuses.map((option) => (
                    <MenuItem key={option} value={option}>
                      {humanize(option)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <TextField select label="Priority" {...field}>
                  {taskPriorities.map((option) => (
                    <MenuItem key={option} value={option}>
                      {humanize(option)}
                    </MenuItem>
                  ))}
                </TextField>
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
