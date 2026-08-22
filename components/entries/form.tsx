'use client';

import { useEffect, useRef, useState } from 'react';

import { labelize } from '@/components/entries/labels';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export const selectClass =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none';

export const textareaClass =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none';

export type FieldErrors = Record<string, string>;

/**
 * The modal chrome every entry dialog shares: a bottom sheet on a phone, a
 * centred card from `sm` up, Escape to dismiss and focus moved to the heading
 * so a keyboard user is not left behind on the page underneath.
 */
export function EntryDialog({
  title,
  saveLabel,
  saving,
  message,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  saveLabel: string;
  saving: boolean;
  message: string | null;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
  children: React.ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-dialog-title"
        className="bg-background max-h-full w-full max-w-lg overflow-y-auto rounded-t-lg border p-6 shadow-lg sm:rounded-lg"
      >
        <h2 id="entry-dialog-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          {title}
        </h2>

        <form action={onSubmit} className="mt-4 space-y-4">
          {children}

          {message ? (
            <p role="alert" className="text-destructive text-sm">
              {message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : saveLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Dialog control ids are prefixed so they cannot collide with the filter bar's
 * controls, which carry the same names on the same page — duplicate ids break
 * the label/input association and with it every by-label selector.
 */
export const dialogId = (name: string): string => `entry-${name}`;

export function DialogField({
  name,
  label,
  errors,
  children,
}: {
  name: string;
  label: string;
  errors: FieldErrors;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={dialogId(name)}>{label}</Label>
      {children}
      {errors[name] ? <p className="text-destructive text-xs">{errors[name]}</p> : null}
    </div>
  );
}

export function DialogChoice({
  name,
  label,
  values,
  current,
  errors,
}: {
  name: string;
  label: string;
  values: string[];
  current: string;
  errors: FieldErrors;
}) {
  return (
    <DialogField name={name} label={label} errors={errors}>
      <select id={dialogId(name)} name={name} defaultValue={current} className={selectClass}>
        {values.map((value) => (
          <option key={value} value={value}>
            {labelize(value)}
          </option>
        ))}
      </select>
    </DialogField>
  );
}

/**
 * The submit half of every entry dialog: POST to create, PATCH to edit, and
 * render the server's field-level 422 details against their own inputs rather
 * than collapsing them into one banner.
 */
export function useEntrySubmit(endpoint: string, id: string | undefined, onSaved: () => void) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function send(body: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    setFieldErrors({});

    const response = await fetch(id ? `${endpoint}/${id}` : endpoint, {
      method: id ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (response.ok) {
      onSaved();
      return;
    }

    const payload = await response.json().catch(() => null);
    const details: { field: string; message?: string }[] = payload?.error?.details ?? [];
    setFieldErrors(
      Object.fromEntries(details.map((detail) => [detail.field, detail.message ?? 'Check this field.']))
    );
    setMessage(payload?.error?.message ?? 'The entry could not be saved.');
  }

  return { saving, message, fieldErrors, send };
}
