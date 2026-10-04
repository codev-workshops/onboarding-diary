import { MenuItem, TextField } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { enumLabel } from '../../utils/labels';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly string[];
  required?: boolean;
}

export function EnumSelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  required,
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          select
          label={label}
          required={required}
          {...field}
          value={field.value ?? ''}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {enumLabel(option)}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
