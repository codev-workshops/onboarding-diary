import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Dropdown } from '../components/Dropdown';
import { Input } from '../components/Input';
import { apiFetch, downloadReport } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { User } from '../lib/types';

const REPORT_TYPES = [
  { value: 'combined', label: 'Combined' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'issues', label: 'Issues' },
  { value: 'feedback', label: 'Feedback' },
] as const;

const ALL = 'all';

const isoDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

export const ReportsPage = () => {
  const { user } = useAuth();
  const [type, setType] = useState<string>('combined');
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [recruit, setRecruit] = useState<string>(ALL);
  const [people, setPeople] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const isManagerView = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    if (!isManagerView) {
      return;
    }
    apiFetch<{ users: User[] }>('/users')
      .then((payload) => setPeople(payload.users))
      .catch(() => setPeople([]));
  }, [isManagerView]);

  const generate = async (format: 'csv' | 'pdf') => {
    if (from > to) {
      setError('Please choose an end date on or after the start date');
      return;
    }
    setError(null);
    setStatus(null);
    const params = new URLSearchParams({ type, format, from, to });
    if (recruit !== ALL) {
      params.set('userId', recruit);
    }
    try {
      await downloadReport(`?${params.toString()}`, `${type}-report-${from}_to_${to}.${format}`);
      setStatus(`Downloaded the ${format.toUpperCase()} report.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report could not be generated');
    }
  };

  return (
    <div className="stack stack--lg">
      <header className="page__header">
        <div>
          <h1>Reports</h1>
          <p className="muted">
            Generate a diary report for a date range and download it as PDF or CSV.
          </p>
        </div>
      </header>

      {error ? <p className="banner banner--error">{error}</p> : null}
      {status ? <p className="banner">{status}</p> : null}

      <Card title="Report options">
        <div className="stack">
          <div className="row">
            <div style={{ minWidth: '200px' }}>
              <Dropdown
                label="Report type"
                value={type}
                options={REPORT_TYPES.map((option) => ({ ...option }))}
                onChange={setType}
              />
            </div>
            <Input
              label="From date"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Input
              label="To date"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
            {isManagerView && people.length > 0 ? (
              <div style={{ minWidth: '220px' }}>
                <Dropdown
                  label="Recruit"
                  value={recruit}
                  options={[
                    { value: ALL, label: 'Everyone I oversee' },
                    ...people.map((person) => ({ value: String(person.id), label: person.name })),
                  ]}
                  onChange={setRecruit}
                />
              </div>
            ) : null}
          </div>
          <div className="actions">
            <Button onClick={() => void generate('pdf')}>Download PDF</Button>
            <Button variant="tertiary" onClick={() => void generate('csv')}>
              Download CSV
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
