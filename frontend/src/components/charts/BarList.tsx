import { Box, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export interface BarItem {
  key: string | number;
  label: string;
  value: number;
  /** Text shown next to the bar; defaults to the value. */
  display?: string;
  color?: string;
  to?: string;
}

/** Horizontal bar chart with one labelled row per item. */
export function BarList({ items, max }: { items: BarItem[]; max?: number }) {
  const scale = max ?? Math.max(1, ...items.map((item) => item.value));
  return (
    <Stack spacing={1}>
      {items.map((item) => (
        <Box key={item.key}>
          <Stack direction="row" justifyContent="space-between">
            {item.to ? (
              <Link component={RouterLink} to={item.to} variant="body2">
                {item.label}
              </Link>
            ) : (
              <Typography variant="body2">{item.label}</Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {item.display ?? item.value}
            </Typography>
          </Stack>
          <Box height={8} borderRadius={4} bgcolor="grey.200" overflow="hidden">
            <Box
              height="100%"
              width={`${Math.min(100, (item.value / scale) * 100)}%`}
              bgcolor={item.color ?? 'primary.main'}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
