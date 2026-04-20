import { Chip } from '@mui/material';

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: '#9E9E9E',
  IN_PROGRESS: '#2196F3',
  COMPLETED: '#4CAF50',
  BLOCKED: '#FF9800',
  OPEN: '#F44336',
  RESOLVED: '#4CAF50',
  WONT_FIX: '#9E9E9E',
};

interface StatusChipProps {
  status: string;
}

export default function StatusChip({ status }: StatusChipProps) {
  const color = STATUS_COLORS[status] || '#9E9E9E';
  const label = status.replace(/_/g, ' ');
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: color,
        color: '#fff',
        fontWeight: 500,
        fontSize: '0.75rem',
      }}
    />
  );
}
