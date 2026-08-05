interface BarChartProps {
  title: string;
  data: Record<string, number>;
}

/// Minimal horizontal bar chart rendered with CSS (no charting dependency).
export default function BarChart({ title, data }: BarChartProps) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, value]) => value));

  return (
    <div className="card chart">
      <h2>{title}</h2>
      {entries.every(([, value]) => value === 0) ? (
        <p className="muted">No data yet.</p>
      ) : (
        <ul className="chart-rows">
          {entries.map(([label, value]) => (
            <li key={label}>
              <span className="chart-label">{label}</span>
              <span className="chart-bar" style={{ width: `${(value / max) * 100}%` }} />
              <span className="chart-value">{value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
