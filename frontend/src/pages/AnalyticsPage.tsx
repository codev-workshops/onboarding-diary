import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { TopBar } from "../components/TopBar";
import { BarChart, LineChart, type Bar, type LineSeries } from "../components/charts";
import { analyticsApi, type AnalyticsResponse } from "../api/analytics";
import type { ApiError } from "../api/types";

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#60a5fa",
  MEDIUM: "#fbbf24",
  HIGH: "#fb923c",
  CRITICAL: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#ef4444",
  IN_PROGRESS: "#fbbf24",
  RESOLVED: "#34d399",
  CLOSED: "#9ca3af",
};

const FEEDBACK_COLORS: Record<string, string> = {
  POSITIVE: "#34d399",
  SUGGESTION: "#60a5fa",
  CONCERN: "#fb923c",
};

function toBars(dist: Record<string, number>, colors: Record<string, string>): Bar[] {
  return Object.entries(dist).map(([label, value]) => ({
    label,
    value,
    color: colors[label] ?? "#60a5fa",
  }));
}

export function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.load({
        dateFrom: from || undefined,
        dateTo: to || undefined,
      });
      setData(response);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("", "");
  }, [load]);

  function applyRange(event: React.FormEvent) {
    event.preventDefault();
    void load(dateFrom, dateTo);
  }

  const completionSeries: LineSeries[] = data
    ? [
        {
          name: "Completion rate",
          color: "#2563eb",
          points: data.taskCompletionTrend.map((p) => ({
            x: p.date,
            y: Math.round(p.completionRate * 100),
          })),
        },
      ]
    : [];

  const volumeSeries: LineSeries[] = data
    ? [
        { name: "Tasks", color: "#2563eb", points: data.activityVolumeTrend.map((p) => ({ x: p.date, y: p.tasks })) },
        { name: "Issues", color: "#ef4444", points: data.activityVolumeTrend.map((p) => ({ x: p.date, y: p.issues })) },
        { name: "Feedback", color: "#34d399", points: data.activityVolumeTrend.map((p) => ({ x: p.date, y: p.feedback })) },
        { name: "Notes", color: "#a855f7", points: data.activityVolumeTrend.map((p) => ({ x: p.date, y: p.notes })) },
      ]
    : [];

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <h1>Analytics</h1>

        <form className="card filters" onSubmit={applyRange}>
          <label>
            From
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
          </label>
          <label>
            To
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
          </label>
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </button>
        </form>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        {data && (
          <div className="chart-grid">
            <section className="card chart-card">
              <h2>Task completion trend</h2>
              <LineChart series={completionSeries} yMax={100} formatY={(v) => `${v}%`} />
            </section>

            <section className="card chart-card">
              <h2>Activity volume over time</h2>
              <LineChart series={volumeSeries} />
            </section>

            <section className="card chart-card">
              <h2>Issue severity distribution</h2>
              <BarChart bars={toBars(data.issueSeverityDistribution, SEVERITY_COLORS)} />
            </section>

            <section className="card chart-card">
              <h2>Issue status distribution</h2>
              <BarChart bars={toBars(data.issueStatusDistribution, STATUS_COLORS)} />
            </section>

            <section className="card chart-card">
              <h2>Feedback type distribution</h2>
              <BarChart bars={toBars(data.feedbackTypeDistribution, FEEDBACK_COLORS)} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
