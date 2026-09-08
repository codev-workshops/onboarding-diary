import { ChartFrame } from './ChartFrame';

const WIDTH = 300;
const HEIGHT = 24;

/** Task completion status: done against everything still open, from the dashboard's counts. */
export function TaskCompletionChart({
  total,
  done,
  open,
  title = 'Task completion status',
}: {
  total: number;
  done: number;
  open: number;
  title?: string;
}) {
  const doneWidth = total === 0 ? 0 : (done / total) * WIDTH;

  return (
    <ChartFrame
      title={title}
      headers={['Status', 'Tasks']}
      rows={[
        { label: 'Done', values: [String(done)] },
        { label: 'Open', values: [String(open)] },
      ]}
      empty={total === 0}
    >
      <svg
        role="img"
        aria-label={`${title}, ${done} done and ${open} open of ${total} tasks`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-6 w-full"
      >
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="fill-slate-200" />
        <rect x={0} y={0} width={doneWidth} height={HEIGHT} className="fill-slate-700" />
      </svg>
      <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-600">
        <span>Done: {done}</span>
        <span>Open: {open}</span>
      </p>
    </ChartFrame>
  );
}
