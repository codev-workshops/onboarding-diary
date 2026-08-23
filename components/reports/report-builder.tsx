'use client';

import { useState } from 'react';
import type { UserRole } from '@prisma/client';

import { selectClass } from '@/components/entries/form';
import { ReportPreview } from '@/components/reports/report-preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReportModel } from '@/src/modules/reports/model';
import { postJson } from '@/src/shared/http/client';

type UserOption = { id: string; full_name: string; role: UserRole };
type DepartmentOption = { id: string; name: string };

type ScopeType = 'SELF' | 'USER' | 'USERS' | 'DEPARTMENT' | 'ORG';
type SectionName = 'TASKS' | 'ISSUES' | 'FEEDBACK' | 'NOTES';

const SCOPES_BY_ROLE: Record<UserRole, { value: ScopeType; label: string }[]> = {
  RECRUIT: [{ value: 'SELF', label: 'My diary' }],
  MANAGER: [
    { value: 'SELF', label: 'My diary' },
    { value: 'USER', label: 'One recruit' },
    { value: 'USERS', label: 'Selected recruits' },
  ],
  ADMIN: [
    { value: 'SELF', label: 'My diary' },
    { value: 'USER', label: 'One user' },
    { value: 'USERS', label: 'Selected users' },
    { value: 'DEPARTMENT', label: 'Department' },
    { value: 'ORG', label: 'Whole organisation' },
  ],
};

const PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
] as const;

const iso = (date: Date): string => date.toISOString().slice(0, 10);

function presetRange(preset: string): { from: string; to: string } | null {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  if (preset === 'month') {
    return {
      from: iso(new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 1))),
      to: iso(utcToday),
    };
  }
  if (preset === 'last-month') {
    const first = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth() - 1, 1));
    const last = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 0));
    return { from: iso(first), to: iso(last) };
  }

  const days = Number(preset);
  if (!Number.isFinite(days)) return null;

  const from = new Date(utcToday.getTime() - (days - 1) * 86_400_000);
  return { from: iso(from), to: iso(utcToday) };
}

/**
 * The report builder. Which scopes and sections are offered follows the
 * caller's role, but only so the form does not invite a request that will be
 * refused: the API re-decides all of it, so hiding "Whole organisation" from a
 * manager is presentation, not authorization (S3).
 */
export function ReportBuilder({
  role,
  self,
  users,
  departments,
}: {
  role: UserRole;
  self: { id: string; full_name: string };
  users: UserOption[];
  departments: DepartmentOption[];
}) {
  const [scopeType, setScopeType] = useState<ScopeType>('SELF');
  const [selected, setSelected] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id ?? '');
  const [preset, setPreset] = useState<string>('30');
  const [custom, setCustom] = useState(presetRange('30') ?? { from: '', to: '' });
  const [sections, setSections] = useState<SectionName[]>(['TASKS', 'ISSUES', 'FEEDBACK']);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [busy, setBusy] = useState<'preview' | 'csv' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportModel | null>(null);

  // Notes never leave their owner, so a manager is not offered the section at
  // all; an admin is, and the read is audited server-side.
  const canRequestNotes = role === 'ADMIN' || scopeType === 'SELF';
  const range = preset === 'custom' ? custom : (presetRange(preset) ?? custom);

  const toggleSection = (section: SectionName) =>
    setSections((current) =>
      current.includes(section) ? current.filter((name) => name !== section) : [...current, section]
    );

  const toggleUser = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  function body(format: 'JSON' | 'CSV' | 'PDF') {
    const chosen = sections.filter((section) => section !== 'NOTES' || canRequestNotes);
    return {
      scope_type: scopeType,
      user_ids: scopeType === 'USER' ? selected.slice(0, 1) : scopeType === 'USERS' ? selected : undefined,
      department_id: scopeType === 'DEPARTMENT' ? departmentId || undefined : undefined,
      date_from: range.from,
      date_to: range.to,
      sections: chosen.length > 0 ? chosen : ['TASKS'],
      include_summary: includeSummary,
      include_details: includeDetails,
      format,
    };
  }

  async function preview() {
    setBusy('preview');
    setError(null);

    const result = await postJson<ReportModel>('/api/v1/reports', body('JSON'));
    setBusy(null);

    if (!result.ok) {
      setReport(null);
      setError(result.message);
      return;
    }
    setReport(result.data);
  }

  async function download(format: 'CSV' | 'PDF') {
    setBusy(format === 'CSV' ? 'csv' : 'pdf');
    setError(null);

    const response = await fetch('/api/v1/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body(format)),
    }).catch(() => null);

    setBusy(null);

    if (!response) {
      setError('Could not reach the server. Check your connection and try again.');
      return;
    }

    if (!response.ok) {
      const envelope = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      setError(envelope.error?.message ?? 'The report could not be generated.');
      return;
    }

    // The filename is the server's, read back from the header rather than
    // rebuilt here, so the download matches the report history.
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = match?.[1] ?? `onboarding-report.${format.toLowerCase()}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Build a report</CardTitle>
          <CardDescription>
            Reports cover at most 366 days and only the people you are allowed to read.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="scope_type">Scope</Label>
              <select
                id="scope_type"
                className={selectClass}
                value={scopeType}
                onChange={(event) => setScopeType(event.target.value as ScopeType)}
              >
                {SCOPES_BY_ROLE[role].map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="preset">Period</Label>
              <select
                id="preset"
                className={selectClass}
                value={preset}
                onChange={(event) => {
                  setPreset(event.target.value);
                  const next = presetRange(event.target.value);
                  if (next) setCustom(next);
                }}
              >
                {PRESETS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date_from">From</Label>
              <Input
                id="date_from"
                type="date"
                value={range.from}
                onChange={(event) => {
                  setPreset('custom');
                  setCustom((current) => ({ ...current, from: event.target.value }));
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date_to">To</Label>
              <Input
                id="date_to"
                type="date"
                value={range.to}
                onChange={(event) => {
                  setPreset('custom');
                  setCustom((current) => ({ ...current, to: event.target.value }));
                }}
              />
            </div>
          </div>

          {scopeType === 'DEPARTMENT' ? (
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="department_id">Department</Label>
              <select
                id="department_id"
                className={selectClass}
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {scopeType === 'USER' || scopeType === 'USERS' ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                {scopeType === 'USER' ? 'Choose one person' : 'People to include'}
              </legend>
              <p className="text-muted-foreground text-xs">
                {scopeType === 'USERS' && selected.length === 0
                  ? 'None chosen — the report covers everyone in your scope.'
                  : `${selected.length} chosen`}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 text-sm">
                    <input
                      type={scopeType === 'USER' ? 'radio' : 'checkbox'}
                      name="report_user"
                      checked={selected.includes(user.id)}
                      onChange={() => (scopeType === 'USER' ? setSelected([user.id]) : toggleUser(user.id))}
                    />
                    {user.full_name}
                  </label>
                ))}
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nobody reports to you yet.</p>
                ) : null}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Sections</legend>
            <div className="flex flex-wrap gap-4">
              {(['TASKS', 'ISSUES', 'FEEDBACK', 'NOTES'] as const)
                .filter((section) => section !== 'NOTES' || canRequestNotes)
                .map((section) => (
                  <label key={section} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sections.includes(section)}
                      onChange={() => toggleSection(section)}
                    />
                    {section.charAt(0) + section.slice(1).toLowerCase()}
                  </label>
                ))}
            </div>
            {!canRequestNotes ? (
              <p className="text-muted-foreground text-xs">
                Private notes stay with their author and are never included in someone else’s report.
              </p>
            ) : null}
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={() => setIncludeSummary((value) => !value)}
              />
              Summary
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={() => setIncludeDetails((value) => !value)}
              />
              Detail rows
            </label>
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={preview} disabled={busy !== null}>
              {busy === 'preview' ? 'Generating…' : 'Preview'}
            </Button>
            <Button type="button" variant="outline" onClick={() => download('CSV')} disabled={busy !== null}>
              {busy === 'csv' ? 'Preparing…' : 'Download CSV'}
            </Button>
            <Button type="button" variant="outline" onClick={() => download('PDF')} disabled={busy !== null}>
              {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report ? <ReportPreview report={report} viewer={self} /> : null}
    </div>
  );
}
