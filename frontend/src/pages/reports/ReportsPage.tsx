import { type FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Page } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import Alert from '../../components/Alert';
import Field from '../../components/Field';
import OptionSelect from '../../components/OptionSelect';
import { addDays, today } from '../../dates';

const TYPES = { COMBINED: 'Combined', TASKS: 'Tasks', ISSUES: 'Issues', FEEDBACK: 'Feedback' };
const FORMATS = { PDF: 'PDF', CSV: 'CSV' };
const PRESETS: [string, number][] = [['Last 7 days', 6], ['Last 30 days', 29], ['Last 90 days', 89]];

interface RecruitOption {
  id: number;
  name: string;
}

function filenameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/);
  return match ? match[1] : fallback;
}

async function loadAllRecruits(): Promise<RecruitOption[]> {
  const all: RecruitOption[] = [];
  for (let page = 0; ; page++) {
    const result = await api.get<Page<RecruitOption>>(`/api/recruits?size=100&page=${page}`);
    all.push(...result.content);
    if (page + 1 >= result.totalPages) {
      return all;
    }
  }
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const isRecruit = user?.role === 'RECRUIT';
  const [recruits, setRecruits] = useState<RecruitOption[]>([]);
  const [recruitId, setRecruitId] = useState(params.get('recruitId') ?? '');
  const [from, setFrom] = useState(addDays(today(), -29));
  const [to, setTo] = useState(today());
  const [type, setType] = useState('COMBINED');
  const [format, setFormat] = useState('PDF');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isRecruit) {
      loadAllRecruits()
        .then(setRecruits)
        .catch(() => setRecruits([]));
    }
  }, [isRecruit]);

  async function download(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!isRecruit && !recruitId) {
      setError('Choose a recruit.');
      return;
    }
    setBusy(true);
    const query = new URLSearchParams({ from, to, type, format });
    if (!isRecruit) {
      query.set('recruitId', recruitId);
    }
    try {
      const response = await fetch(`/api/reports?${query}`, { credentials: 'same-origin' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.fieldErrors?.[0] ? `${body.fieldErrors[0].field} ${body.fieldErrors[0].message}` : body?.message ?? 'Could not generate report');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filenameFrom(response.headers.get('Content-Disposition'), `report.${format.toLowerCase()}`);
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate report');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Reports</h1>
      </div>
      <form className="card form-card" onSubmit={download} noValidate>
        <Alert>{error}</Alert>
        {!isRecruit && (
          <Field label="Recruit" htmlFor="recruitId" required>
            <OptionSelect
              id="recruitId"
              options={Object.fromEntries(recruits.map((r) => [String(r.id), r.name]))}
              emptyLabel="Choose a recruit"
              value={recruitId}
              onChange={setRecruitId}
            />
          </Field>
        )}
        <div className="badges">
          {PRESETS.map(([label, days]) => (
            <button key={label} type="button" className="btn btn-small" onClick={() => { setFrom(addDays(today(), -days)); setTo(today()); }}>
              {label}
            </button>
          ))}
        </div>
        <div className="form-row">
          <Field label="From" htmlFor="from" required>
            <input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To" htmlFor="to" required>
            <input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Report type" htmlFor="type" required>
            <OptionSelect id="type" options={TYPES} value={type} onChange={setType} />
          </Field>
          <Field label="Format" htmlFor="format" required>
            <OptionSelect id="format" options={FORMATS} value={format} onChange={setFormat} />
          </Field>
        </div>
        <p className="muted small">Date range is inclusive, up to 366 days. Notes are not included in reports.</p>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Generating…' : 'Download report'}
          </button>
        </div>
      </form>
    </>
  );
}
