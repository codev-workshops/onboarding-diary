import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, TextField } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { createEntry, updateEntry } from '../../api/diary';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskRequest,
} from '../../api/diaryTypes';
import { applyServerErrors, isConflict } from '../../api/serverErrors';
import { useAuth } from '../../auth/useAuth';
import { EntryDateField } from '../../components/diary/EntryDateField';
import { EntryDialog } from '../../components/diary/EntryDialog';
import { EnumSelectField } from '../../components/diary/EnumSelectField';
import { todayIso } from '../../utils/dates';
import { taskSchema, type TaskValues } from '../../validation/diarySchemas';

const FIELDS = ['entryDate', 'title', 'description', 'category', 'status', 'priority'];

function toValues(task: Task | null): TaskValues {
  return {
    entryDate: task?.entryDate ?? todayIso(),
    title: task?.title ?? '',
    description: task?.description ?? '',
    category: task?.category ?? ('' as TaskValues['category']),
    status: task?.status ?? 'TODO',
    priority: task?.priority ?? 'MEDIUM',
  };
}

interface Props {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSaved: (created: boolean) => void;
  onConflict: () => void;
}

export function TaskFormDialog({ open, task, onClose, onSaved, onConflict }: Props) {
  const { user } = useAuth();
  const schema = useMemo(() => taskSchema(user?.profile.startDate ?? todayIso()), [user]);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskValues>({ resolver: zodResolver(schema), defaultValues: toValues(task) });

  useEffect(() => {
    if (open) {
      reset(toValues(task));
      setServerError(null);
    }
  }, [open, task, reset]);

  const onSubmit = async ({ description, ...values }: TaskValues) => {
    setServerError(null);
    const body: TaskRequest = { ...values, description: description.trim() || undefined };
    try {
      if (task) {
        await updateEntry<Task, TaskRequest>('tasks', task.id, { ...body, version: task.version });
      } else {
        await createEntry<Task, TaskRequest>('tasks', body);
      }
      onSaved(!task);
    } catch (error) {
      setServerError(applyServerErrors(error, setError, FIELDS, 'Could not save task'));
      if (isConflict(error)) onConflict();
    }
  };

  return (
    <EntryDialog
      open={open}
      title={task ? 'Edit task' : 'New task'}
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
      <TextField
        label="Description"
        multiline
        minRows={3}
        {...register('description')}
        error={!!errors.description}
        helperText={errors.description?.message}
      />
      <Grid container columnSpacing={2}>
        <Grid item xs={12} sm={4}>
          <EnumSelectField
            control={control}
            name="category"
            label="Category"
            options={TASK_CATEGORIES}
            required
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <EnumSelectField control={control} name="status" label="Status" options={TASK_STATUSES} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <EnumSelectField
            control={control}
            name="priority"
            label="Priority"
            options={TASK_PRIORITIES}
          />
        </Grid>
      </Grid>
    </EntryDialog>
  );
}
