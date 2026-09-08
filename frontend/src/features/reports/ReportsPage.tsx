import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import { issueStatusLabels } from '../../api/diary';
import type { ReportFilters, ReportFormat, ReportSection } from '../../api/reports';
import { downloadReport, previewReport, reportSections } from '../../api/reports';
import { statusLabels } from '../../api/tasks';
import { listTeamRecruits } from '../../api/team';
import { useAuth } from '../../auth/auth-context';
import { buttonClass, inputClass } from '../../components/FormField';

const presets = {
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '90': 'Last 90 days',
  all: 'All entries',
  custom: 'Custom range',
} as const;

type Preset = keyof typeof presets;

/** Preview bodies are clamped for readability; the downloaded files always carry the full text. */
const previewLimit = 280;

function clamp(body: string | null): string | null {
  if (body === null || body.length <= previewLimit) {
    return body;
  }

  return `${body.slice(0, previewLimit).trimEnd()}…`;
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const { user } = useAuth();
  const picksRecruit = user !== null && user.role !== 'Recruit';

  const [recruitId, setRecruitId] = useState<number | null>(null);
  const [preset, setPreset] = useState<Preset>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sections, setSections] = useState<ReportSection[]>(reportSections);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [pendingFormat, setPendingFormat] = useState<ReportFormat | null>(null);

  const roster = useQuery({
    queryKey: ['team', 'report-picker'],
    queryFn: () => listTeamRecruits({ page: 1, pageSize: 100 }),
    enabled: picksRecruit,
  });

  const range =
    preset === 'all'
      ? { from: undefined, to: undefined }
      : preset === 'custom'
        ? {
            from: customFrom === '' ? undefined : customFrom,
            to: customTo === '' ? undefined : customTo,
          }
        : { from: isoDaysAgo(Number(preset)), to: isoDaysAgo(0) };

  const filters: ReportFilters = {
    userId: picksRecruit && recruitId !== null ? recruitId : undefined,
    ...range,
    sections,
  };

  const ready = user !== null && (!picksRecruit || recruitId !== null) && sections.length > 0;

  const report = useQuery({
    queryKey: ['reports', filters],
    queryFn: () => previewReport(filters),
    enabled: ready,
  });

  const data = report.data;

  async function download(format: ReportFormat) {
    setDownloadError(null);
    setPendingFormat(format);

    try {
      const file = await downloadReport(filters, format);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(
        error instanceof ApiError ? error.message : 'Could not generate the report. Try again.'
      );
    } finally {
      setPendingFormat(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-slate-600">
          {picksRecruit
            ? 'Generate a diary report for a recruit you can view.'
            : 'Generate a report of your own diary.'}
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        {picksRecruit ? (
          <label className="text-sm">
            <span className="block text-slate-600">Recruit</span>
            <select
              className={inputClass}
              value={recruitId ?? ''}
              onChange={(event) =>
                setRecruitId(event.target.value === '' ? null : Number(event.target.value))
              }
            >
              <option value="">Select a recruit</option>
              {(roster.data?.items ?? []).map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="text-sm">
          <span className="block text-slate-600">Range</span>
          <select
            className={inputClass}
            value={preset}
            onChange={(event) => setPreset(event.target.value as Preset)}
          >
            {Object.entries(presets).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {preset === 'custom' ? (
          <>
            <label className="text-sm">
              <span className="block text-slate-600">From</span>
              <input
                type="date"
                className={inputClass}
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-600">To</span>
              <input
                type="date"
                className={inputClass}
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </label>
          </>
        ) : null}

        <fieldset className="text-sm sm:col-span-2 lg:col-span-4">
          <legend className="block text-slate-600">Sections</legend>
          <div className="mt-1 flex flex-wrap gap-4">
            {reportSections.map((section) => (
              <label key={section} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sections.includes(section)}
                  onChange={(event) =>
                    setSections((current) =>
                      event.target.checked
                        ? reportSections.filter(
                            (candidate) => current.includes(candidate) || candidate === section
                          )
                        : current.filter((candidate) => candidate !== section)
                    )
                  }
                />
                {section}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          disabled={!ready || pendingFormat !== null}
          onClick={() => void download('Csv')}
        >
          {pendingFormat === 'Csv' ? 'Preparing CSV…' : 'Download CSV'}
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!ready || pendingFormat !== null}
          onClick={() => void download('Pdf')}
        >
          {pendingFormat === 'Pdf' ? 'Preparing PDF…' : 'Download PDF'}
        </button>
        {sections.length === 0 ? (
          <p className="text-sm text-slate-600">Select at least one section.</p>
        ) : null}
      </div>

      {downloadError !== null ? (
        <p role="alert" className="text-sm text-red-600">
          {downloadError}
        </p>
      ) : null}

      {picksRecruit && recruitId === null ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          Select a recruit to preview their report.
        </div>
      ) : null}

      {report.isPending && ready ? (
        <p className="text-sm text-slate-600">Building the report…</p>
      ) : null}

      {report.isError ? (
        <div role="alert" className="space-y-2 text-sm text-red-600">
          <p>
            {report.error instanceof ApiError
              ? report.error.message
              : 'Could not build the report. Try again.'}
          </p>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-slate-700"
            onClick={() => void report.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {data !== undefined ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">{data.header.fullName}</h2>
            <p className="text-sm text-slate-600">
              {data.header.departmentName ?? 'No department'} ·{' '}
              {data.header.from === null && data.header.to === null
                ? 'All entries'
                : `${data.header.from ?? 'start'} to ${data.header.to ?? 'today'}`}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              ['Tasks', data.summary.totalTasks],
              ['Completed', data.summary.completedTasks],
              ['Open issues', data.summary.openIssues],
              ['Resolved issues', data.summary.resolvedIssues],
              ['Feedback', data.summary.feedbackCount],
              ['Notes', data.summary.noteCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          {data.sections.includes('Tasks') ? (
            <PreviewSection title="Tasks" isEmpty={data.tasks.length === 0}>
              {data.tasks.map((task) => (
                <PreviewEntry
                  key={task.id}
                  title={task.title}
                  meta={`${task.entryDate} · ${task.category} · ${statusLabels[task.status]} · ${task.priority}`}
                  body={clamp(task.description)}
                />
              ))}
            </PreviewSection>
          ) : null}

          {data.sections.includes('Issues') ? (
            <PreviewSection title="Issues" isEmpty={data.issues.length === 0}>
              {data.issues.map((issue) => (
                <PreviewEntry
                  key={issue.id}
                  title={issue.title}
                  meta={`${issue.entryDate} · ${issue.severity} · ${issueStatusLabels[issue.status]}`}
                  body={clamp(issue.description)}
                />
              ))}
            </PreviewSection>
          ) : null}

          {data.sections.includes('Feedback') ? (
            <PreviewSection title="Feedback" isEmpty={data.feedback.length === 0}>
              {data.feedback.map((feedback) => (
                <PreviewEntry
                  key={feedback.id}
                  title={feedback.title}
                  meta={`${feedback.entryDate} · ${feedback.type}`}
                  body={clamp(feedback.message)}
                />
              ))}
            </PreviewSection>
          ) : null}

          {data.sections.includes('Notes') ? (
            <PreviewSection title="Notes" isEmpty={data.notes.length === 0}>
              {data.notes.map((note) => (
                <PreviewEntry
                  key={note.id}
                  title={note.title}
                  meta={`${note.entryDate}${note.tags.length > 0 ? ` · ${note.tags.join(', ')}` : ''}`}
                  body={clamp(note.content)}
                />
              ))}
            </PreviewSection>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PreviewSection({
  title,
  isEmpty,
  children,
}: {
  title: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {isEmpty ? (
        <p className="text-sm text-slate-600">No entries in this range.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {children}
        </ul>
      )}
    </div>
  );
}

function PreviewEntry({ title, meta, body }: { title: string; meta: string; body: string | null }) {
  return (
    <li className="space-y-1 p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-medium">{title}</span>
        <span className="text-slate-600">{meta}</span>
      </div>
      {body !== null ? <p className="whitespace-pre-line text-slate-700">{body}</p> : null}
    </li>
  );
}
