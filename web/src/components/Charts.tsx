export interface BarDatum {
  label: string;
  value: number;
  tone?: 'primary' | 'accent' | 'danger';
}

export interface BarChartProps {
  data: ReadonlyArray<BarDatum>;
}

export const BarChart = ({ data }: BarChartProps) => {
  const max = Math.max(1, ...data.map((datum) => datum.value));
  return (
    <div className="bars">
      {data.map((datum) => (
        <div className="bar" key={datum.label}>
          <span>{datum.label}</span>
          <span className="bar__track">
            <span
              className={[
                'bar__fill',
                datum.tone === 'accent' ? 'bar__fill--accent' : '',
                datum.tone === 'danger' ? 'bar__fill--danger' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ width: `${Math.round((datum.value / max) * 100)}%` }}
            />
          </span>
          <span className="bar__value">{datum.value}</span>
        </div>
      ))}
    </div>
  );
};

export interface ActivityPoint {
  date: string;
  tasks: number;
  issues: number;
}

export const ActivityChart = ({ data }: { data: ReadonlyArray<ActivityPoint> }) => {
  /** Minimum axis of 4 so a single entry does not fill the whole column. */
  const max = Math.max(4, ...data.map((point) => point.tasks + point.issues));
  return (
    <div className="stack">
      <div className="spark">
        {data.map((point) => (
          <div className="spark__col" key={point.date}>
            <span className="spark__stack">
              {point.issues > 0 ? (
                <span
                  className="spark__segment spark__segment--issues"
                  style={{ height: `${(point.issues / max) * 100}%` }}
                  title={`${point.issues} issues on ${point.date}`}
                />
              ) : null}
              {point.tasks > 0 ? (
                <span
                  className="spark__segment"
                  style={{ height: `${(point.tasks / max) * 100}%` }}
                  title={`${point.tasks} tasks on ${point.date}`}
                />
              ) : null}
            </span>
            <span className="spark__label">{point.date.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="legend">
        <span>
          <span className="legend__swatch" />
          Tasks logged
        </span>
        <span>
          <span className="legend__swatch legend__swatch--issues" />
          Issues logged
        </span>
      </div>
    </div>
  );
};
