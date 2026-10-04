import { Box, Stack, Typography } from '@mui/material';

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Donut chart with a legend; the total is shown in the middle. */
export function DonutChart({ title, segments }: { title: string; segments: DonutSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const arcs = segments
    .filter((segment) => segment.value > 0)
    .reduce<{ segment: DonutSegment; length: number; offset: number }[]>((acc, segment) => {
      const previous = acc[acc.length - 1];
      const offset = previous ? previous.offset + previous.length : 0;
      return [...acc, { segment, length: (segment.value / total) * CIRCUMFERENCE, offset }];
    }, []);
  const description = `${title}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`;

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <svg viewBox="0 0 100 100" width={110} height={110} role="img" aria-label={description}>
        <circle cx={50} cy={50} r={RADIUS} fill="none" stroke="#eeeeee" strokeWidth={14} />
        {arcs.map(({ segment, length, offset }) => (
          <circle
            key={segment.key}
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke={segment.color}
            strokeWidth={14}
            strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        ))}
        <text x={50} y={50} textAnchor="middle" dominantBaseline="central" fontSize={20}>
          {total}
        </text>
      </svg>
      <Stack spacing={0.5} aria-hidden>
        {segments.map((segment) => (
          <Stack key={segment.key} direction="row" spacing={1} alignItems="center">
            <Box width={10} height={10} borderRadius="50%" bgcolor={segment.color} />
            <Typography variant="body2">
              {segment.label}: {segment.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
