import { Chip } from '@mui/material';
import { enumColor, enumLabel } from '../../utils/labels';

export function EnumChip({
  value,
  variant = 'filled',
}: {
  value: string;
  variant?: 'filled' | 'outlined';
}) {
  return <Chip size="small" label={enumLabel(value)} color={enumColor(value)} variant={variant} />;
}
