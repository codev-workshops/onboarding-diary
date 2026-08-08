import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Dropdown } from '../components/Dropdown';
import { ActivityChart, BarChart } from '../components/Charts';
import { Badge, toneForValue } from '../components/Badge';
import { apiFetch, buildQuery } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { DashboardData, User } from '../lib/types';

const ALL = 'all';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [people, setPeople] = useState<User[]>([]);
  const [selected, setSelected] = useState<string>(ALL);
  const [error, setError] = useState<string | null>(null);

  const isManagerView = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    if (!isManagerView) {
      return;
    }
    apiFetch<{ users: User[] }>('/users')
      .then((payload) => setPeople(payload.users))
      .catch(() => setPeople([]));
  }, [isManagerView]);

  const load = useCallback(async () => {
    try {
      const query = buildQuery({ userId: selected === ALL ? undefined : selected });
      setData(await apiFetch<DashboardData>(`/dashboard${query}`));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the dashboard');
    }
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="stack stack--lg">
      <header className="page__header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            {isManagerView
              ? 'Progress across the recruits you oversee.'
              : 'Your onboarding progress at a glance.'}
          </p>
        </div>
        {isManagerView && people.length > 0 ? (
          <div style={{ minWidth: '240px' }}>
            <Dropdown
              label="Recruit"
              value={selected}
              options={[
                { value: ALL, label: 'Everyone I oversee' },
                ...people.map((person) => ({ value: String(person.id), label: person.name })),
              ]}
              onChange={setSelected}
            />
          </div>
        ) : null}
      </header>

      {error ? <p className="banner banner--error">{error}</p> : null}

      {data ? (
        <>
          <div className="grid">
            {[
              { label: 'Tasks logged', value: data.counts.tasks },
              { label: 'Task completion', value: `${data.completionRate}%` },
              { label: 'Open issues', value: data.openIssues },
              { label: 'Feedback items', value: data.counts.feedback },
              { label: 'Notes', value: data.counts.notes },
            ].map((stat) => (
              <Card key={stat.label}>
                <p className="overline">{stat.label}</p>
                <p className="stat__value">{stat.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid--two">
            <Card title="Tasks by status">
              <BarChart
                data={Object.entries(data.tasksByStatus).map(([label, value]) => ({
                  label,
                  value,
                  tone:
                    label === 'Blocked' ? 'danger' : label === 'Completed' ? 'primary' : 'accent',
                }))}
              />
            </Card>
            <Card title="Issues by severity">
              <BarChart
                data={Object.entries(data.issuesBySeverity).map(([label, value]) => ({
                  label,
                  value,
                  tone: label === 'Critical' || label === 'High' ? 'danger' : 'accent',
                }))}
              />
            </Card>
          </div>

          <Card title="Activity over recent days">
            {data.activity.length === 0 ? (
              <p className="muted">No activity recorded yet.</p>
            ) : (
              <ActivityChart data={data.activity} />
            )}
          </Card>

          <div className="grid--two">
            <Card title="Recent tasks">
              {data.recent.tasks.length === 0 ? (
                <p className="muted">No tasks yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.tasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.date}</td>
                        <td className="table__title">{task.title}</td>
                        <td>
                          <Badge tone={toneForValue(task.status)}>{task.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="Recent issues">
              {data.recent.issues.length === 0 ? (
                <p className="muted">No issues yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.issues.map((issue) => (
                      <tr key={issue.id}>
                        <td>{issue.date}</td>
                        <td className="table__title">{issue.title}</td>
                        <td>
                          <Badge tone={toneForValue(issue.severity)}>{issue.severity}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      ) : (
        <p className="muted">Loading dashboard…</p>
      )}
    </div>
  );
};
