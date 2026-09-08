import type { TrendDay } from '../../api/tasks';
import { ChartFrame } from './ChartFrame';

const WIDTH = 300;
const HEIGHT = 90;

export function entriesOn(day: TrendDay): number {
  return day.tasksLogged + day.issuesOpened + day.feedbackCount + day.noteCount;
}

/** Diary entries logged per day — tasks, issues, feedback and notes by their diary date. */
export function EntriesPerDayChart({
  days,
  title = 'Entries logged per day',
}: {
  days: TrendDay[];
  title?: string;
}) {
  const totals = days.map(entriesOn);
  const max = Math.max(...totals, 0);
  const slot = days.length === 0 ? 0 : WIDTH / days.length;

  return (
    <ChartFrame
      title={title}
      headers={['Date', 'Entries']}
      rows={days.map((day, index) => ({ label: day.date, values: [String(totals[index])] }))}
      empty={max === 0}
    >
      <svg
        role="img"
        aria-label={`${title}, ${days.length} days, highest ${max}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-24 w-full"
      >
        {days.map((day, index) => {
          const height = max === 0 ? 0 : (totals[index] / max) * HEIGHT;
          return (
            <rect
              key={day.date}
              x={index * slot}
              y={HEIGHT - height}
              width={Math.max(slot - 1, 1)}
              height={height}
              className="fill-slate-700"
            />
          );
        })}
      </svg>
      <p className="mt-1 flex justify-between text-xs text-slate-600">
        <span>{days[0]?.date}</span>
        <span>Highest: {max}</span>
        <span>{days[days.length - 1]?.date}</span>
      </p>
    </ChartFrame>
  );
}
