import { TextField } from '@mui/material';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { useAuth } from '../../auth/useAuth';
import { earliestEntryDate, todayIso } from '../../utils/dates';

interface Props {
  registration: UseFormRegisterReturn;
  error?: FieldError;
}

export function EntryDateField({ registration, error }: Props) {
  const { user } = useAuth();
  return (
    <TextField
      label="Date"
      type="date"
      required
      InputLabelProps={{ shrink: true }}
      inputProps={{
        max: todayIso(),
        min: user ? earliestEntryDate(user.profile.startDate) : undefined,
      }}
      {...registration}
      error={!!error}
      helperText={error?.message}
    />
  );
}
