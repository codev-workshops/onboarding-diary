import {
  Box,
  Checkbox,
  FormControl,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState } from 'react';
import { enumLabel } from '../../utils/labels';

const FIELD_SX = { minWidth: { xs: '100%', sm: 170 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } };

interface MultiSelectProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
  formatOption?: (value: string) => string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  formatOption = enumLabel,
}: MultiSelectProps) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FormControl size="small" sx={FIELD_SX}>
      <InputLabel id={id}>{label}</InputLabel>
      <Select
        labelId={id}
        multiple
        value={selected}
        onChange={(event) => {
          const value = event.target.value;
          onChange(typeof value === 'string' ? value.split(',') : value);
        }}
        input={<OutlinedInput label={label} />}
        renderValue={(values) => values.map(formatOption).join(', ')}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            <Checkbox size="small" checked={selected.includes(option)} />
            <ListItemText primary={formatOption(option)} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

interface DateRangeProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

export function DateRangeFilter({ from, to, onChange }: DateRangeProps) {
  return (
    <>
      <TextField
        size="small"
        type="date"
        label="From"
        margin="none"
        value={from}
        InputLabelProps={{ shrink: true }}
        inputProps={{ max: to || undefined }}
        onChange={(event) => onChange({ from: event.target.value, to })}
        sx={FIELD_SX}
        fullWidth={false}
      />
      <TextField
        size="small"
        type="date"
        label="To"
        margin="none"
        value={to}
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: from || undefined }}
        onChange={(event) => onChange({ from, to: event.target.value })}
        sx={FIELD_SX}
        fullWidth={false}
      />
    </>
  );
}

interface SearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** Text search that waits for typing to pause before updating the filter. */
export function SearchFilter({ label, value, onChange }: SearchProps) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onChange(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <TextField
      size="small"
      margin="none"
      label={label}
      value={text}
      onChange={(event) => setText(event.target.value)}
      fullWidth={false}
      sx={{ ...FIELD_SX, minWidth: { xs: '100%', sm: 220 } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
      }}
    />
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center" mb={2} role="search">
      {children}
    </Box>
  );
}
