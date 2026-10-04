import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface Props {
  label: string;
  value: number | string;
  icon: ReactElement;
  caption?: string;
  to?: string;
}

export function StatCard({ label, value, icon, caption, to }: Props) {
  const content = (
    <CardContent>
      <Box display="flex" alignItems="center" gap={1}>
        {icon}
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight={600} mt={1}>
        {value}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
    </CardContent>
  );
  return (
    <Card sx={{ height: '100%' }}>
      {to ? (
        <CardActionArea component={RouterLink} to={to} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}
