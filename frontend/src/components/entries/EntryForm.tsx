"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/components/ui/FormField";
import type { FormErrors } from "@/lib/apiClient";
import { EMPTY_ERRORS, toFormErrors } from "@/lib/formErrors";
import formStyles from "@/components/ui/forms.module.css";
import styles from "./entries.module.css";
import type { SelectOption } from "./FilterBar";

interface BaseField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  /** Places two fields side by side on wide screens when both share a `row`. */
  row?: string;
}

export type EntryFieldDef =
  | (BaseField & { type: "text"; maxLength?: number })
  | (BaseField & { type: "textarea"; maxLength?: number; rows?: number })
  | (BaseField & { type: "date"; max?: string; min?: string })
  | (BaseField & { type: "select"; options: SelectOption[]; placeholder?: string });

export type FormValues = Record<string, string>;

interface EntryFormProps {
  fields: EntryFieldDef[];
  initialValues: FormValues;
  /** Client-side validation; returns field→message. Runs before submit. */
  validate?: (values: FormValues) => Record<string, string>;
  /** Performs the API call; thrown `ApiError`s are mapped onto the fields via `toFormErrors`. */
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  busy?: boolean;
  /** Rendered above the buttons (e.g. permission notes). */
  footer?: ReactNode;
  idPrefix?: string;
}

/**
 * Generic entry form driven by a field definition list. Owns draft values and
 * the `{ form, fields }` error state; the caller owns the API call.
 */
export function EntryForm({
  fields,
  initialValues,
  validate,
  onSubmit,
  onCancel,
  submitLabel,
  busy,
  footer,
  idPrefix = "entry",
}: EntryFormProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors.fields[key]) {
      setErrors((e) => {
        const next = { ...e.fields };
        delete next[key];
        return { ...e, fields: next };
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clientErrors = validate?.(values) ?? {};
    if (Object.keys(clientErrors).length > 0) {
      setErrors({ fields: clientErrors });
      return;
    }
    setErrors(EMPTY_ERRORS);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setErrors(toFormErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = busy || submitting;

  const renderField = (f: EntryFieldDef) => {
    const id = `${idPrefix}-${f.key}`;
    const error = errors.fields[f.key];
    const value = values[f.key] ?? "";
    switch (f.type) {
      case "text":
        return (
          <FormField
            key={f.key}
            id={id}
            label={f.label}
            hint={f.hint}
            error={error}
            value={value}
            maxLength={f.maxLength}
            required={f.required}
            disabled={disabled || f.disabled}
            onChange={(e) => set(f.key, e.target.value)}
          />
        );
      case "date":
        return (
          <FormField
            key={f.key}
            id={id}
            type="date"
            label={f.label}
            hint={f.hint}
            error={error}
            value={value}
            min={f.min}
            max={f.max}
            required={f.required}
            disabled={disabled || f.disabled}
            onChange={(e) => set(f.key, e.target.value)}
          />
        );
      case "textarea":
        return (
          <div key={f.key} className={formStyles.field}>
            <label htmlFor={id} className={formStyles.label}>
              {f.label}
            </label>
            <textarea
              id={id}
              className={`${styles.textarea} ${error ? styles.inputInvalid : ""}`}
              value={value}
              rows={f.rows ?? 5}
              maxLength={f.maxLength}
              disabled={disabled || f.disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : f.hint ? `${id}-hint` : undefined}
              onChange={(e) => set(f.key, e.target.value)}
            />
            {f.hint && !error && (
              <span id={`${id}-hint`} className={formStyles.hint}>
                {f.hint}
              </span>
            )}
            {error && (
              <span id={`${id}-error`} className={formStyles.fieldError} role="alert">
                {error}
              </span>
            )}
          </div>
        );
      case "select":
        return (
          <div key={f.key} className={formStyles.field}>
            <label htmlFor={id} className={formStyles.label}>
              {f.label}
            </label>
            <select
              id={id}
              className={`${styles.select} ${error ? styles.inputInvalid : ""}`}
              value={value}
              disabled={disabled || f.disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => set(f.key, e.target.value)}
            >
              {f.placeholder !== undefined && <option value="">{f.placeholder}</option>}
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {f.hint && !error && <span className={formStyles.hint}>{f.hint}</span>}
            {error && (
              <span id={`${id}-error`} className={formStyles.fieldError} role="alert">
                {error}
              </span>
            )}
          </div>
        );
    }
  };

  // Group consecutive fields sharing a `row` into a two-column grid.
  const groups: EntryFieldDef[][] = [];
  for (const f of fields) {
    const last = groups[groups.length - 1];
    if (f.row && last && last[0].row === f.row) last.push(f);
    else groups.push([f]);
  }

  return (
    <form className={formStyles.form} onSubmit={(e) => void handleSubmit(e)} noValidate data-testid={`${idPrefix}-form`}>
      {errors.form && (
        <div className={formStyles.formError} role="alert" data-testid={`${idPrefix}-form-error`}>
          {errors.form}
        </div>
      )}
      {groups.map((g) =>
        g.length > 1 ? (
          <div key={g[0].row} className={styles.grid2}>
            {g.map(renderField)}
          </div>
        ) : (
          renderField(g[0])
        ),
      )}
      {footer}
      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.button} disabled={disabled} data-testid={`${idPrefix}-submit`}>
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className={`${formStyles.button} ${formStyles.buttonSecondary}`}
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
