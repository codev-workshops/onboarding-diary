export interface Bar {
  label: string;
  value: number;
  color: string;
}

export function BarChart({ bars, valueSuffix = "" }: { bars: Bar[]; valueSuffix?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const total = bars.reduce((sum, b) => sum + b.value, 0);
  if (total === 0) {
    return <p className="empty">No data in range.</p>;
  }
  return (
    <div className="bar-chart" role="img" aria-label="Bar chart">
      {bars.map((bar) => (
        <div key={bar.label} className="bar-row" title={`${bar.label}: ${bar.value}`}>
          <span className="bar-label">{bar.label}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${(bar.value / max) * 100}%`, background: bar.color }}
            />
          </span>
          <span className="bar-value">
            {bar.value}
            {valueSuffix}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface LineSeries {
  name: string;
  color: string;
  points: { x: string; y: number }[];
}

interface LineChartProps {
  series: LineSeries[];
  yMax?: number;
  formatY?: (value: number) => string;
}

const WIDTH = 520;
const HEIGHT = 200;
const PAD_LEFT = 40;
const PAD_BOTTOM = 28;
const PAD_TOP = 12;
const PAD_RIGHT = 12;

export function LineChart({ series, yMax, formatY = (v) => String(v) }: LineChartProps) {
  const labels = series[0]?.points.map((p) => p.x) ?? [];
  const allValues = series.flatMap((s) => s.points.map((p) => p.y));
  const max = yMax ?? Math.max(1, ...allValues);
  const count = labels.length;

  if (count === 0) {
    return <p className="empty">No data in range.</p>;
  }

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xFor = (i: number) => PAD_LEFT + (count === 1 ? plotW / 2 : (i / (count - 1)) * plotW);
  const yFor = (v: number) => PAD_TOP + plotH - (v / max) * plotH;

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Line chart" className="line-svg">
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + plotH} className="axis" />
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + plotH}
          x2={PAD_LEFT + plotW}
          y2={PAD_TOP + plotH}
          className="axis"
        />
        <text x={PAD_LEFT - 6} y={PAD_TOP + 4} className="axis-text" textAnchor="end">
          {formatY(max)}
        </text>
        <text x={PAD_LEFT - 6} y={PAD_TOP + plotH} className="axis-text" textAnchor="end">
          {formatY(0)}
        </text>
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              points={s.points.map((p, i) => `${xFor(i)},${yFor(p.y)}`).join(" ")}
            />
            {s.points.map((p, i) => (
              <circle key={`${s.name}-${p.x}`} cx={xFor(i)} cy={yFor(p.y)} r={3} fill={s.color}>
                <title>{`${s.name} • ${p.x}: ${formatY(p.y)}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {labels.map((label, i) => (
          <text key={label} x={xFor(i)} y={HEIGHT - 8} className="axis-text" textAnchor="middle">
            {label.slice(5)}
          </text>
        ))}
      </svg>
      {series.length > 1 && (
        <ul className="chart-legend">
          {series.map((s) => (
            <li key={s.name}>
              <span className="legend-swatch" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
