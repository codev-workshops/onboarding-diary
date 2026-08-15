import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
    >
      <div>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle ? (
          <Typography color="text.secondary" variant="body2">
            {subtitle}
          </Typography>
        ) : null}
      </div>
      {action}
    </Stack>
  );
}
