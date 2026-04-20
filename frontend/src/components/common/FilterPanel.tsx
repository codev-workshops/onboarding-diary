import { Box, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
}

interface FilterPanelProps {
  filters: FilterConfig[];
  onFilterChange: (filterId: string, value: string) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (date: string) => void;
  onDateToChange?: (date: string) => void;
  showDateRange?: boolean;
}

export default function FilterPanel({
  filters,
  onFilterChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showDateRange = false,
}: FilterPanelProps) {
  return (
    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
      {filters.map((filter) => (
        <FormControl key={filter.id} size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{filter.label}</InputLabel>
          <Select
            value={filter.value}
            label={filter.label}
            onChange={(e: SelectChangeEvent) => onFilterChange(filter.id, e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {filter.options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
      {showDateRange && (
        <>
          <DatePicker
            label="From"
            value={dateFrom ? dayjs(dateFrom) : null}
            onChange={(val: Dayjs | null) => onDateFromChange?.(val?.format('YYYY-MM-DD') || '')}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
          />
          <DatePicker
            label="To"
            value={dateTo ? dayjs(dateTo) : null}
            onChange={(val: Dayjs | null) => onDateToChange?.(val?.format('YYYY-MM-DD') || '')}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
          />
        </>
      )}
    </Box>
  );
}
