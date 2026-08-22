'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { labelize } from '@/components/entries/labels';
import { selectClass } from '@/components/entries/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SelectFilter = { name: string; label: string; anyLabel: string; values: string[] };

/**
 * Filters are written to the query string rather than to component state, so
 * back/forward and a copied link all behave, and the server does the filtering.
 * Every entry kind gets the same bar with a different set of selects.
 */
export function EntryFilterBar({
  basePath,
  legend,
  canFilterByOwner,
  searchPlaceholder,
  selects,
  extra,
}: {
  basePath: string;
  legend: string;
  canFilterByOwner: boolean;
  searchPlaceholder: string;
  selects: SelectFilter[];
  extra?: { name: string; label: string; placeholder: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(form: FormData) {
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && value.trim().length > 0) next.set(key, value.trim());
    }
    router.push(next.size > 0 ? `${basePath}?${next}` : basePath);
  }

  const current = (key: string) => searchParams.get(key) ?? '';

  return (
    <form
      action={apply}
      aria-label={legend}
      className="bg-card grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Field label="Search" htmlFor="q">
        <Input id="q" name="q" defaultValue={current('q')} placeholder={searchPlaceholder} />
      </Field>

      {selects.map((select) => (
        <Field key={select.name} label={select.label} htmlFor={select.name}>
          <select
            id={select.name}
            name={select.name}
            defaultValue={current(select.name)}
            className={selectClass}
          >
            <option value="">{select.anyLabel}</option>
            {select.values.map((value) => (
              <option key={value} value={value}>
                {labelize(value)}
              </option>
            ))}
          </select>
        </Field>
      ))}

      {extra ? (
        <Field label={extra.label} htmlFor={extra.name}>
          <Input
            id={extra.name}
            name={extra.name}
            defaultValue={current(extra.name)}
            placeholder={extra.placeholder}
          />
        </Field>
      ) : null}

      <Field label="From" htmlFor="date_from">
        <Input id="date_from" name="date_from" type="date" defaultValue={current('date_from')} />
      </Field>

      <Field label="To" htmlFor="date_to">
        <Input id="date_to" name="date_to" type="date" defaultValue={current('date_to')} />
      </Field>

      {canFilterByOwner ? (
        <Field label="Owner ID" htmlFor="owner_id">
          {/*
            A manager may narrow to one report. An id outside their scope is
            refused by the API with 403 rather than quietly ignored, which is
            why this is a filter and not a hidden default.
          */}
          <Input id="owner_id" name="owner_id" defaultValue={current('owner_id')} placeholder="Optional" />
        </Field>
      ) : null}

      <div className="flex items-end gap-2">
        <Button type="submit">Apply</Button>
        <Button type="button" variant="ghost" onClick={() => router.push(basePath)}>
          Reset
        </Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
