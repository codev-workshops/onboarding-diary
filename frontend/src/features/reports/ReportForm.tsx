"use client";

import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { FormField } from "@/components/ui/FormField";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import { REPORT_FORMATS, REPORT_MAX_SPAN_DAYS, REPORT_TYPES } from "@/lib/apiClient";
import type { ReportFormat, ReportType } from "@/lib/apiClient";
import { useStores } from "@/stores/StoreProvider";
import styles from "./reports.module.css";

const TYPE_LABELS: Record<ReportType, string> = {
  TASKS: "Tasks",
  ISSUES: "Issues",
  FEEDBACK: "Feedback",
  COMBINED: "Combined",
};

const FORMAT_LABELS: Record<ReportFormat, string> = { PDF: "PDF", CSV: "CSV" };

interface ReportFormProps {
  /** Preselects the recruit (from `/recruits/{id}`); the selector stays editable. */
  recruitId?: string | null;
}

/** `/reports` form (REQ-FUNC-080..086): role-scoped recruit, validated range, type/format, Generate + Retry. */
export const ReportForm = observer(function ReportForm({ recruitId }: ReportFormProps) {
  const { auth, reports } = useStores();
  const role = auth.role;

  useEffect(() => {
    if (role) reports.init(role, recruitId);
  }, [reports, role, recruitId]);

  const errors = reports.visibleErrors;
  const busy = reports.generating;

  return (
    <form
      className={`${formStyles.form} ${styles.stack}`}
      noValidate
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void reports.generate();
      }}
      data-testid="report-form"
    >
      {reports.recruitRequired && (
        <div className={formStyles.field}>
          <label htmlFor="report-recruit" className={formStyles.label}>
            Recruit
          </label>
          <select
            id="report-recruit"
            className={`${tableStyles.select} ${errors.recruitId ? formStyles.inputInvalid : ""}`}
            value={reports.form.recruitId}
            onChange={(e) => reports.setField("recruitId", e.target.value)}
            onBlur={() => reports.touch("recruitId")}
            disabled={busy || reports.recruitsLoading}
            aria-invalid={errors.recruitId ? true : undefined}
            aria-describedby={errors.recruitId ? "report-recruit-error" : undefined}
            data-testid="report-recruit"
          >
            <option value="">{reports.recruitsLoading ? "Loading recruits…" : "Select a recruit"}</option>
            {reports.recruits.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName} ({r.email})
              </option>
            ))}
          </select>
          {reports.recruitsError && (
            <span className={formStyles.fieldError} role="alert">
              {reports.recruitsError}{" "}
              <button type="button" className={`${formStyles.button} ${formStyles.buttonSecondary} ${styles.retry}`} onClick={() => void reports.loadRecruits()}>
                Retry
              </button>
            </span>
          )}
          {errors.recruitId && (
            <span id="report-recruit-error" className={formStyles.fieldError} role="alert">
              {errors.recruitId}
            </span>
          )}
          {!reports.recruitsLoading && !reports.recruitsError && reports.recruits.length === 0 && (
            <span className={formStyles.hint}>{role === "ADMIN" ? "No active recruits yet." : "No recruits are assigned to you yet."}</span>
          )}
        </div>
      )}

      <div className={styles.dates}>
        <FormField
          id="report-from"
          label="From"
          type="date"
          required
          value={reports.form.from}
          onChange={(e) => reports.setField("from", e.target.value)}
          onBlur={() => reports.touch("from")}
          disabled={busy}
          error={errors.from}
          data-testid="report-from"
        />
        <FormField
          id="report-to"
          label="To"
          type="date"
          required
          value={reports.form.to}
          onChange={(e) => reports.setField("to", e.target.value)}
          onBlur={() => reports.touch("to")}
          disabled={busy}
          error={errors.to}
          hint={`Inclusive; at most ${REPORT_MAX_SPAN_DAYS} days.`}
          data-testid="report-to"
        />
      </div>

      <fieldset className={styles.radios} disabled={busy}>
        <legend>Report type</legend>
        {REPORT_TYPES.map((t) => (
          <label key={t} className={styles.radio}>
            <input
              type="radio"
              name="report-type"
              value={t}
              checked={reports.form.type === t}
              onChange={() => reports.setField("type", t)}
              data-testid={`report-type-${t}`}
            />
            {TYPE_LABELS[t]}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.radios} disabled={busy}>
        <legend>Format</legend>
        {REPORT_FORMATS.map((f) => (
          <label key={f} className={styles.radio}>
            <input
              type="radio"
              name="report-format"
              value={f}
              checked={reports.form.format === f}
              onChange={() => reports.setField("format", f)}
              data-testid={`report-format-${f}`}
            />
            {FORMAT_LABELS[f]}
          </label>
        ))}
      </fieldset>

      {reports.error && (
        <div className={`${formStyles.formError} ${styles.errorBanner}`} role="alert" data-testid="report-error">
          <span>{reports.error}</span>
          <button
            type="button"
            className={`${formStyles.button} ${formStyles.buttonSecondary} ${styles.retry}`}
            onClick={() => void reports.retry()}
            disabled={busy}
            data-testid="report-retry"
          >
            {busy ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      {!reports.error && reports.lastDownloaded && (
        <div className={formStyles.formSuccess} role="status" data-testid="report-success">
          Downloaded {reports.lastDownloaded}
          {reports.feedbackOmitted ? " — feedback was omitted because it is not visible to you." : "."}
        </div>
      )}

      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.button} disabled={busy || (reports.submitted && !reports.canGenerate)} data-testid="report-generate">
          {busy && <span className={styles.spinner} aria-hidden="true" />}
          {busy ? "Generating…" : "Generate"}
        </button>
      </div>
    </form>
  );
});
