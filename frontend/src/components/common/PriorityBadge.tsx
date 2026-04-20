import { Chip } from '@mui/material';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#8BC34A',
  MEDIUM: '#FFC107',
  HIGH: '#FF9800',
  URGENT: '#F44336',
};

interface PriorityBadgeProps {
  priority: string;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color = PRIORITY_COLORS[priority] || '#9E9E9E';
  return (
    <Chip
      label={priority}
      size="small"
      sx={{
        backgroundColor: color,
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 22,
      }}
    />
  );
}
