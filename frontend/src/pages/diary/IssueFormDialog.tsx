import { zodResolver } from '@hookform/resolvers/zod';
import { Autocomplete, Grid, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { createEntry, listEntries, updateEntry } from '../../api/diary';
import {
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  type Issue,
  type IssueRequest,
  type Task,
} from '../../api/diaryTypes';
import { applyServerErrors, isConflict } from '../../api/serverErrors';
import { useAuth } from '../../auth/useAuth';
import { EntryDateField } from '../../components/diary/EntryDateField';
import { EntryDialog } from '../../components/diary/EntryDialog';
import { EnumSelectField } from '../../components/diary/EnumSelectField';
import { todayIso } from '../../utils/dates';
import { issueSchema, type IssueValues } from '../../validation/diarySchemas';

const FIELDS = [
  'entryDate',
  'title',
  'description',
  'severity',
  'status',
  'resolutionNotes',
  'relatedTaskId',
];

const TASK_OPTION_LIMIT = 20;

interface TaskOption {
  id: number;
  title: string;
}

function toValues(issue: Issue | null): IssueValues {
  return {
    entryDate: issue?.entryDate ?? todayIso(),
    title: issue?.title ?? '',
    description: issue?.description ?? '',
    severity: issue?.severity ?? ('' as IssueValues['severity']),
    status: issue?.status ?? 'OPEN',
    resolutionNotes: issue?.resolutionNotes ?? '',
    relatedTaskId: issue?.relatedTaskId ?? null,
  };
}

interface Props {
  open: boolean;
  issue: Issue | null;
  onClose: () => void;
  onSaved: (created: boolean) => void;
  onConflict: () => void;
}

export function IssueFormDialog({ open, issue, onClose, onSaved, onConflict }: Props) {
  const { user } = useAuth();
  const schema = useMemo(() => issueSchema(user?.profile.startDate ?? todayIso()), [user]);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IssueValues>({ resolver: zodResolver(schema), defaultValues: toValues(issue) });

  const [taskSearch, setTaskSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskOption | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(taskSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [taskSearch]);
  const tasks = useQuery({
    queryKey: ['tasks', 'options', debouncedSearch],
    queryFn: () =>
      listEntries<Task>('tasks', { size: TASK_OPTION_LIMIT, q: debouncedSearch || undefined }),
    enabled: open,
  });
  const taskOptions = useMemo<TaskOption[]>(() => {
    const options = (tasks.data?.content ?? []).map(({ id, title }) => ({ id, title }));
    if (selectedTask && !options.some((option) => option.id === selectedTask.id)) {
      options.unshift(selectedTask);
    }
    return options;
  }, [tasks.data, selectedTask]);

  useEffect(() => {
    if (open) {
      reset(toValues(issue));
      setServerError(null);
      setTaskSearch('');
      setSelectedTask(
        issue?.relatedTaskId
          ? { id: issue.relatedTaskId, title: issue.relatedTaskTitle ?? 'Linked task' }
          : null,
      );
    }
  }, [open, issue, reset]);

  const resolved = ['RESOLVED', 'CLOSED'].includes(watch('status'));

  const onSubmit = async ({ description, resolutionNotes, ...values }: IssueValues) => {
    setServerError(null);
    const body: IssueRequest = {
      ...values,
      description: description.trim() || undefined,
      resolutionNotes: resolutionNotes.trim() || undefined,
    };
    try {
      if (issue) {
        await updateEntry<Issue, IssueRequest>('issues', issue.id, {
          ...body,
          version: issue.version,
        });
      } else {
        await createEntry<Issue, IssueRequest>('issues', body);
      }
      onSaved(!issue);
    } catch (error) {
      setServerError(applyServerErrors(error, setError, FIELDS, 'Could not save issue'));
      if (isConflict(error)) onConflict();
    }
  };

  return (
    <EntryDialog
      open={open}
      title={issue ? 'Edit issue' : 'New issue'}
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
        <Grid item xs={6}>
          <EnumSelectField
            control={control}
            name="severity"
            label="Severity"
            options={ISSUE_SEVERITIES}
            required
          />
        </Grid>
        <Grid item xs={6}>
          <EnumSelectField
            control={control}
            name="status"
            label="Status"
            options={ISSUE_STATUSES}
          />
        </Grid>
      </Grid>
      <TextField
        label="Resolution notes"
        multiline
        minRows={2}
        required={resolved}
        {...register('resolutionNotes')}
        error={!!errors.resolutionNotes}
        helperText={
          errors.resolutionNotes?.message ?? (resolved ? 'Describe how it was resolved' : undefined)
        }
      />
      <Controller
        control={control}
        name="relatedTaskId"
        render={({ field, fieldState }) => (
          <Autocomplete
            options={taskOptions}
            loading={tasks.isFetching}
            filterOptions={(options) => options}
            value={taskOptions.find((option) => option.id === field.value) ?? null}
            onChange={(_, option) => {
              setSelectedTask(option);
              field.onChange(option?.id ?? null);
            }}
            onInputChange={(_, value, reason) => {
              if (reason === 'input') setTaskSearch(value);
              if (reason === 'clear') setTaskSearch('');
            }}
            noOptionsText={taskSearch ? 'No matching tasks' : 'No tasks yet'}
            getOptionLabel={(option) => option.title}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Related task"
                placeholder="Type to search your tasks"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        )}
      />
    </EntryDialog>
  );
}
