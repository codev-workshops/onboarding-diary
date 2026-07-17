import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState } from '@/components/states';
import { Badge, toneFor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useUsers } from '@/hooks/data';
import { api, downloadReport } from '@/lib/api';
import type { ReportData } from '@/lib/types';
import { toDateInput } from '@/lib/utils';

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 30);
  return { start: toDateInput(start), end: toDateInput(end) };
}

export function ReportsPage() {
  const { user } = useAuth();
  const canScope = user?.role === 'Manager' || user?.role === 'Admin';
  const { data: users } = useUsers(canScope);
  const [searchParams] = useSearchParams();
  const [range, setRange] = useState(defaultRange());
  const [recruitId, setRecruitId] = useState(() => searchParams.get('recruitId') ?? '');
  const [report, setReport] = useState<ReportData | null>(null);

  const recruits = users?.filter((u) => u.role === 'Recruit') ?? [];

  const runMutation = useMutation({
    mutationFn: () =>
      api<ReportData>('/reports', {
        query: { start: range.start, end: range.end, recruitId: recruitId || undefined },
      }),
    onSuccess: setReport,
  });

  const exportQuery = () => ({
    start: range.start,
    end: range.end,
    recruitId: recruitId || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Preview a report on screen, then export it to PDF or CSV."
      />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label htmlFor="report-start">Start</Label>
            <Input
              id="report-start"
              type="date"
              value={range.start}
              onChange={(e) => setRange({ ...range, start: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="report-end">End</Label>
            <Input
              id="report-end"
              type="date"
              value={range.end}
              onChange={(e) => setRange({ ...range, end: e.target.value })}
            />
          </div>
          {canScope ? (
            <div>
              <Label htmlFor="report-recruit">Recruit</Label>
              <Select
                id="report-recruit"
                value={recruitId}
                onChange={(e) => setRecruitId(e.target.value)}
                className="w-48"
              >
                <option value="">All in scope</option>
                {recruits.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
            {runMutation.isPending ? 'Generating…' : 'Generate report'}
          </Button>
          {report ? (
            <>
              <Button variant="outline" onClick={() => void downloadReport('pdf', exportQuery())}>
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" onClick={() => void downloadReport('csv', exportQuery())}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>

      {runMutation.isError ? (
        <ErrorState message={(runMutation.error as Error).message} />
      ) : report ? (
        <ReportView report={report} />
      ) : (
        <EmptyState title="No report yet" hint="Choose a date range and generate a report." />
      )}
    </div>
  );
}

function ReportView({ report }: { report: ReportData }) {
  return (
    <div className="space-y-6" data-testid="report-view">
      <Card>
        <CardHeader>
          <CardTitle>
            {report.meta.scope}: {report.meta.start} → {report.meta.end}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric
            label="Tasks"
            value={`${report.summary.taskCompleted}/${report.summary.taskTotal}`}
          />
          <Metric
            label="Open issues"
            value={`${report.summary.issueOpen}/${report.summary.issueTotal}`}
          />
          <Metric label="Feedback" value={report.summary.feedbackTotal} />
          <Metric label="Notes" value={report.summary.noteTotal} />
        </CardContent>
      </Card>

      <ReportSection title={`Tasks (${report.tasks.length})`}>
        {report.tasks.map((t, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 py-2">
            <span className="text-sm text-muted-foreground">{t.date}</span>
            <span className="font-medium">{t.title}</span>
            <Badge tone={toneFor(t.status)}>{t.status}</Badge>
            <span className="text-sm text-muted-foreground">· {t.owner}</span>
          </li>
        ))}
      </ReportSection>

      <ReportSection title={`Issues (${report.issues.length})`}>
        {report.issues.map((it, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 py-2">
            <span className="text-sm text-muted-foreground">{it.date}</span>
            <span className="font-medium">{it.title}</span>
            <Badge tone={toneFor(it.status)}>{it.status}</Badge>
            <Badge tone={toneFor(it.severity)}>{it.severity}</Badge>
            <span className="text-sm text-muted-foreground">· {it.owner}</span>
          </li>
        ))}
      </ReportSection>

      <ReportSection title={`Feedback (${report.feedback.length})`}>
        {report.feedback.map((f, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 py-2">
            <span className="text-sm text-muted-foreground">{f.date}</span>
            <span className="font-medium">{f.subject}</span>
            <Badge tone={toneFor(f.type)}>{f.type}</Badge>
            <span className="text-sm text-muted-foreground">· {f.owner}</span>
          </li>
        ))}
      </ReportSection>

      <ReportSection title={`Notes (${report.notes.length})`}>
        {report.notes.map((n, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 py-2">
            <span className="text-sm text-muted-foreground">{n.date}</span>
            <span className="font-medium">{n.title}</span>
            <span className="text-sm text-muted-foreground">· {n.owner}</span>
          </li>
        ))}
      </ReportSection>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children.length > 0 ? (
          <ul className="divide-y divide-border">{children}</ul>
        ) : (
          <p className="text-sm text-muted-foreground">No entries in range.</p>
        )}
      </CardContent>
    </Card>
  );
}
