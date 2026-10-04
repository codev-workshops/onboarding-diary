import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  InputAdornment,
  MenuItem,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ROLES,
  createUser,
  generateTemporaryPassword,
  type AdminUser,
  type ManagerOption,
} from '../../api/admin';
import { applyServerErrors } from '../../api/serverErrors';
import type { Role } from '../../api/types';
import { EntryDialog } from '../../components/diary/EntryDialog';
import { enumLabel } from '../../utils/labels';

const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const schema = z.object({
  email: z.string().trim().email('Enter a valid email').max(255),
  temporaryPassword: z
    .string()
    .regex(PASSWORD, '8-72 characters with upper and lower case letters and a digit'),
  fullName: z.string().trim().min(1, 'Required').max(120),
  jobTitle: z.string().trim().max(120),
  department: z.string().trim().min(1, 'Required').max(120),
  startDate: z.string().regex(DATE, 'Must be a valid date (YYYY-MM-DD)'),
  roles: z.array(z.enum(['RECRUIT', 'MANAGER', 'ADMIN'])).min(1, 'Pick at least one role'),
  managerId: z.string(),
});

type Values = z.infer<typeof schema>;
const FIELDS = Object.keys(schema.shape);

function defaults(): Values {
  return {
    email: '',
    temporaryPassword: generateTemporaryPassword(),
    fullName: '',
    jobTitle: '',
    department: '',
    startDate: new Date().toISOString().slice(0, 10),
    roles: ['RECRUIT'],
    managerId: '',
  };
}

interface Props {
  open: boolean;
  managers: ManagerOption[];
  onClose: () => void;
  onCreated: (user: AdminUser, temporaryPassword: string) => void;
}

export function CreateUserDialog({ open, managers, onClose, onCreated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults() });

  useEffect(() => {
    if (open) {
      reset(defaults());
      setServerError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values: Values) => {
    setServerError(null);
    try {
      const user = await createUser({
        ...values,
        jobTitle: values.jobTitle || undefined,
        managerId: values.managerId ? Number(values.managerId) : null,
      });
      onCreated(user, values.temporaryPassword);
    } catch (error) {
      setServerError(applyServerErrors(error, setError, FIELDS, 'Could not create the user'));
    }
  };

  return (
    <EntryDialog
      open={open}
      title="New user"
      error={serverError}
      submitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <TextField
        label="Email"
        required
        fullWidth
        margin="dense"
        {...register('email')}
        error={!!errors.email}
        helperText={errors.email?.message}
      />
      <TextField
        label="Temporary password"
        required
        fullWidth
        margin="dense"
        {...register('temporaryPassword')}
        error={!!errors.temporaryPassword}
        helperText={
          errors.temporaryPassword?.message ?? 'The user must change it when they first log in.'
        }
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Button
                size="small"
                onClick={() =>
                  setValue('temporaryPassword', generateTemporaryPassword(), {
                    shouldValidate: true,
                  })
                }
              >
                Generate
              </Button>
            </InputAdornment>
          ),
        }}
      />
      <TextField
        label="Full name"
        required
        fullWidth
        margin="dense"
        {...register('fullName')}
        error={!!errors.fullName}
        helperText={errors.fullName?.message}
      />
      <TextField label="Job title" fullWidth margin="dense" {...register('jobTitle')} />
      <TextField
        label="Department"
        required
        fullWidth
        margin="dense"
        {...register('department')}
        error={!!errors.department}
        helperText={errors.department?.message}
      />
      <TextField
        label="Start date"
        type="date"
        required
        fullWidth
        margin="dense"
        InputLabelProps={{ shrink: true }}
        {...register('startDate')}
        error={!!errors.startDate}
        helperText={errors.startDate?.message}
      />
      <Controller
        control={control}
        name="roles"
        render={({ field }) => (
          <RoleCheckboxes
            value={field.value}
            onChange={field.onChange}
            error={errors.roles?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="managerId"
        render={({ field }) => (
          <ManagerSelect managers={managers} value={field.value} onChange={field.onChange} />
        )}
      />
    </EntryDialog>
  );
}

export function RoleCheckboxes({
  value,
  onChange,
  error,
}: {
  value: Role[];
  onChange: (roles: Role[]) => void;
  error?: string;
}) {
  return (
    <FormControl error={!!error} margin="dense" component="fieldset">
      <FormLabel component="legend">Roles</FormLabel>
      <FormGroup row>
        {ROLES.map((role) => (
          <FormControlLabel
            key={role}
            label={enumLabel(role)}
            control={
              <Checkbox
                checked={value.includes(role)}
                onChange={(event) =>
                  onChange(
                    event.target.checked ? [...value, role] : value.filter((r) => r !== role),
                  )
                }
              />
            }
          />
        ))}
      </FormGroup>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
}

export function ManagerSelect({
  managers,
  value,
  onChange,
  excludeId,
}: {
  managers: ManagerOption[];
  value: string;
  onChange: (managerId: string) => void;
  excludeId?: number;
}) {
  return (
    <TextField
      select
      label="Manager"
      fullWidth
      margin="dense"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <MenuItem value="">
        <em>No manager</em>
      </MenuItem>
      {managers
        .filter((manager) => manager.id !== excludeId)
        .map((manager) => (
          <MenuItem key={manager.id} value={String(manager.id)}>
            {manager.fullName} ({manager.email})
          </MenuItem>
        ))}
    </TextField>
  );
}
