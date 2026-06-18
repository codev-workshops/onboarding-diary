import { useState } from "react";
import { AxiosError } from "axios";
import { TopBar } from "../components/TopBar";
import {
  reportsApi,
  triggerDownload,
  type ReportFormat,
  type ReportType,
} from "../api/reports";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "TASKS", label: "Tasks" },
  { value: "ISSUES", label: "Issues" },
  { value: "FEEDBACK", label: "Feedback" },
  { value: "COMBINED", label: "Combined" },
];

async function readBlobMessage(blob: Blob): Promise<string | null> {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text);
    return typeof parsed.message === "string" ? parsed.message : null;
  } catch {
    return null;
  }
}

export function ReportsPage() {
  const [type, setType] = useState<ReportType>("TASKS");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState<ReportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: ReportFormat) {
    setBusy(format);
    setError(null);
    try {
      const file = await reportsApi.download({
        type,
        format,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      triggerDownload(file);
    } catch (err) {
      const axiosError = err as AxiosError;
      const data = axiosError.response?.data;
      let message = "Unable to generate report.";
      if (data instanceof Blob) {
        message = (await readBlobMessage(data)) ?? message;
      }
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <h1>Reports</h1>
        <p className="metric-sub">
          Generate a report scoped to what you can see. Recruits get their own data, managers their
          assigned recruits, and admins everyone.
        </p>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        <section className="card report-form" aria-label="Report options">
          <div className="filters">
            <label>
              Report type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                aria-label="Report type"
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Date from"
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Date to"
              />
            </label>
          </div>

          <div className="report-actions">
            <button
              type="button"
              className="button"
              disabled={busy !== null}
              onClick={() => download("CSV")}
            >
              {busy === "CSV" ? "Preparing…" : "Download CSV"}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy !== null}
              onClick={() => download("PDF")}
            >
              {busy === "PDF" ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
