/**
 * Report builder (T-170, T-172). Rendered both on the recruit's own Reports page and inside
 * the manager's recruit view, where `ownerId` scopes the request to that recruit (FR-R4).
 */

import {
  createReportBody,
  REPORT_FORMATS,
  REPORT_SECTIONS,
  todayUtc,
  type CreateReportBody,
  type ReportSection,
} from '@onboarding-diary/shared';
import type { ReactNode } from 'react';

import { Button } from '../../components/ui/Button.js';
import { Field } from '../../components/ui/Field.js';
import { DateInput } from '../../components/ui/Input.js';
import { ApiError } from '../../lib/apiClient.js';
import { useZodForm } from '../../lib/forms.js';
import { useAuth } from '../auth/AuthContext.js';
import { useReportDownload } from './useReportDownload.js';

const SECTION_LABELS: Record<ReportSection, string> = {
  TASKS: 'Tasks',
  ISSUES: 'Issues',
  FEEDBACK: 'Feedback',
  NOTES: 'Notes',
};

/** First day of the current month, the range most reports are asked for. */
function startOfMonth(): string {
  return `${todayUtc().slice(0, 7)}-01`;
}

export function ReportBuilder({
  ownerId,
  ownerName,
}: {
  ownerId?: string;
  ownerName?: string;
} = {}): ReactNode {
  const { user } = useAuth();
  const download = useReportDownload();

  const form = useZodForm(createReportBody, {
    defaultValues: {
      ...(ownerId === undefined ? {} : { ownerId }),
      from: startOfMonth(),
      to: todayUtc(),
      sections: [...REPORT_SECTIONS],
      format: 'CSV',
    },
  });

  const sections = form.watch('sections') ?? [];
  const isCombined = REPORT_SECTIONS.every((section) => sections.includes(section));

  function toggleSection(section: ReportSection, checked: boolean): void {
    const next = checked
      ? [...sections, section]
      : sections.filter((current) => current !== section);
    form.setValue('sections', next, { shouldValidate: form.formState.isSubmitted });
  }

  const onSubmit = form.handleSubmit((values: CreateReportBody) => {
    // A failure is rendered from the mutation state, so it is not rethrown here.
    download.mutate({
      ...values,
      ...(ownerId === undefined ? {} : { ownerId }),
      fallbackName: ownerName ?? user?.fullName ?? 'recruit',
    });
  });

  const failure = download.error;

  return (
    <form
      aria-label="Report builder"
      className="flex max-w-xl flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4"
      noValidate
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" error={form.formState.errors.from?.message} required>
          {(ids) => (
            <DateInput
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('from')}
            />
          )}
        </Field>
        <Field label="To" error={form.formState.errors.to?.message} required>
          {(ids) => (
            <DateInput
              id={ids.id}
              aria-describedby={ids.describedBy}
              aria-invalid={ids.invalid}
              {...form.register('to')}
            />
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Sections</legend>
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={isCombined}
            onChange={(event) =>
              form.setValue('sections', event.target.checked ? [...REPORT_SECTIONS] : [], {
                shouldValidate: form.formState.isSubmitted,
              })
            }
          />
          Combined report (all sections)
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {REPORT_SECTIONS.map((section) => (
            <label key={section} className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={sections.includes(section)}
                onChange={(event) => toggleSection(section, event.target.checked)}
              />
              {SECTION_LABELS[section]}
            </label>
          ))}
        </div>
        {form.formState.errors.sections === undefined ? null : (
          <p className="mt-1 text-xs font-medium text-red-700" role="alert">
            {form.formState.errors.sections.message}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Format</legend>
        <div className="mt-2 flex gap-4">
          {REPORT_FORMATS.map((format) => (
            <label key={format} className="flex items-center gap-2 text-sm text-slate-800">
              <input type="radio" value={format} {...form.register('format')} />
              {format}
            </label>
          ))}
        </div>
      </fieldset>

      {failure === null ? null : (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {failure instanceof ApiError
            ? failure.message
            : 'The report could not be generated. Please try again.'}
        </p>
      )}
      {download.isSuccess ? (
        <p className="text-sm text-emerald-700" role="status">
          Downloaded {download.data}
        </p>
      ) : null}

      <div>
        <Button type="submit" isLoading={download.isPending}>
          {download.isPending ? 'Generating report' : 'Download report'}
        </Button>
      </div>
    </form>
  );
}
