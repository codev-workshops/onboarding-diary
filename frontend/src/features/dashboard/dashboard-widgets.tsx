import { Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

export function SummaryCard({ title, value, caption }: { title: string; value: number | string; caption?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        {caption ? (
          <Typography variant="body2" color="text.secondary">
            {caption}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ChartCard({
  title,
  height = 280,
  children,
}: {
  title: string;
  height?: number;
  children: ReactElement;
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1">{title}</Typography>
        <Box sx={{ height, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
