import { Paper, Stack } from '@mui/material';
import type { ReactNode } from 'react';

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
        {children}
      </Stack>
    </Paper>
  );
}
