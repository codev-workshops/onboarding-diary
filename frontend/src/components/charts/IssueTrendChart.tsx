import type { TrendDay } from '../../api/tasks';
import { ChartFrame } from './ChartFrame';

const WIDTH = 300;
const HEIGHT = 90;

function points(values: number[], max: number): string {
  if (values.length === 0) {
    return '';
  }

  const step = values.length === 1 ? 0 : WIDTH / (values.length - 1);
  return values
    .map((value, index) => {
      const y = max === 0 ? HEIGHT : HEIGHT - (value / max) * HEIGHT;
      return `${index * step},${y}`;
    })
    .join(' ');
}

/** Issues opened (by diary date) against issues resolved (by resolution timestamp). */
export function IssueTrendChart({
  days,
  title = 'Issues opened and resolved per day',
}: {
  days: TrendDay[];
  title?: string;
}) {
  const opened = days.map((day) => day.issuesOpened);
  const resolved = days.map((day) => day.issuesResolved);
  const max = Math.max(...opened, ...resolved, 0);

  return (
    <ChartFrame
      title={title}
      headers={['Date', 'Opened', 'Resolved']}
      rows={days.map((day) => ({
        label: day.date,
        values: [String(day.issuesOpened), String(day.issuesResolved)],
      }))}
      empty={max === 0}
    >
      <svg
        role="img"
        aria-label={`${title}, ${days.length} days, highest ${max}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-24 w-full"
      >
        <polyline
          points={points(opened, max)}
          fill="none"
          strokeWidth={2}
          className="stroke-slate-800"
        />
        <polyline
          points={points(resolved, max)}
          fill="none"
          strokeWidth={2}
          strokeDasharray="5 3"
          className="stroke-slate-400"
        />
      </svg>
      <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-600">
        <span>— Opened</span>
        <span>- - Resolved</span>
        <span>Highest: {max}</span>
      </p>
    </ChartFrame>
  );
}
