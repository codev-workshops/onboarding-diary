import { useState } from 'react';
import { downloadReport } from '../api/reports';
import type { ReportFormat } from '../api/reports';

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDownload(format: ReportFormat) {
    setError(null);
    setBusy(true);
    try {
      await downloadReport(format, { from: from || undefined, to: to || undefined });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Reports</h1>
      <div className="card">
        <p className="muted">Export your tasks, issues, feedback and notes for a date range.</p>

        <label htmlFor="from">From</label>
        <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />

        <label htmlFor="to">To</label>
        <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" disabled={busy} onClick={() => void handleDownload('pdf')}>
            Download PDF
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={() => void handleDownload('csv')}>
            Download CSV
          </button>
        </div>
      </div>
    </section>
  );
}
