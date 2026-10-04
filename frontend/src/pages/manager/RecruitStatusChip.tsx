import { Chip } from '@mui/material';
import type { RecruitSummary } from '../../api/manager';

export function RecruitStatusChip({ recruit }: { recruit: RecruitSummary }) {
  if (!recruit.enabled) return <Chip size="small" label="Disabled" />;
  if (recruit.highSeverityOpenIssues > 0) {
    return <Chip size="small" color="error" label="Urgent issues" />;
  }
  if (recruit.inactive) return <Chip size="small" color="warning" label="Inactive" />;
  return <Chip size="small" color="success" variant="outlined" label="On track" />;
}
