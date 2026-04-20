import { Chip } from '@mui/material';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#2196F3',
  MEDIUM: '#FFC107',
  HIGH: '#FF9800',
  CRITICAL: '#F44336',
};

interface SeverityBadgeProps {
  severity: string;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const color = SEVERITY_COLORS[severity] || '#9E9E9E';
  return (
    <Chip
      label={severity}
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
