"use client";

import type { ReactNode } from "react";
import formStyles from "@/components/ui/forms.module.css";
import styles from "./entries.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

export type FilterFieldDef =
  | { key: string; label: string; type: "date" }
  | { key: string; label: string; type: "select"; options: SelectOption[]; placeholder?: string };

interface FilterBarProps<F extends { [K in keyof F]: string }> {
  /** Rendered in order; `key` must be a key of the filter object (and the URL query key). */
  fields: FilterFieldDef[];
  values: F;
  onChange: (patch: Partial<F>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  disabled?: boolean;
  /** Extra controls (e.g. sort select) rendered next to the reset button. */
  children?: ReactNode;
  idPrefix?: string;
}

/** Generic filter bar: date/select fields driven by a field definition list. */
export function FilterBar<F extends { [K in keyof F]: string }>({
  fields,
  values,
  onChange,
  onReset,
  hasActiveFilters,
  disabled,
  children,
  idPrefix = "filter",
}: FilterBarProps<F>) {
  return (
    <form
      className={styles.filterBar}
      role="search"
      aria-label="Filters"
      data-testid="filter-bar"
      onSubmit={(e) => e.preventDefault()}
    >
      {fields.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const value = (values as Record<string, string>)[f.key] ?? "";
        return (
          <div key={f.key} className={formStyles.field}>
            <label htmlFor={id} className={formStyles.label}>
              {f.label}
            </label>
            {f.type === "date" ? (
              <input
                id={id}
                type="date"
                className={formStyles.input}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<F>)}
              />
            ) : (
              <select
                id={id}
                className={styles.select}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<F>)}
              >
                <option value="">{f.placeholder ?? "All"}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
      <div className={styles.filterActions}>
        {children}
        <button
          type="button"
          className={`${formStyles.button} ${formStyles.buttonSecondary}`}
          onClick={onReset}
          disabled={disabled || !hasActiveFilters}
          data-testid="filter-reset"
        >
          Clear filters
        </button>
      </div>
    </form>
  );
}
