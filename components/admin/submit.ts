'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { FieldErrors } from '@/components/entries/form';

export type AdminRequest = {
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
};

/**
 * The admin screens are server-rendered lists over client mutations, so a write
 * finishes with `router.refresh()` rather than local state — the row the admin
 * sees afterwards is the row the database returned through the same scoped
 * service that rendered the page.
 *
 * Field-level 422 details are rendered against their own inputs; the codes that
 * have no input to attach to (`LAST_ADMIN`, `MANAGER_HAS_REPORTS`,
 * `DEPARTMENT_IN_USE`) surface as the banner message, which is what the server
 * wrote them as.
 */
export function useAdminSubmit(onDone?: () => void) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function send(request: AdminRequest): Promise<Record<string, unknown> | null> {
    setSaving(true);
    setMessage(null);
    setFieldErrors({});

    const response = await fetch(request.path, {
      method: request.method,
      headers: { 'content-type': 'application/json' },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    });

    setSaving(false);

    if (response.ok) {
      const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
      router.refresh();
      onDone?.();
      return isRecord(payload) && isRecord(payload.data) ? payload.data : null;
    }

    const payload = await response.json().catch(() => null);
    const details: { field: string; message?: string }[] = payload?.error?.details ?? [];
    setFieldErrors(
      Object.fromEntries(details.map((detail) => [detail.field, detail.message ?? 'Check this field.']))
    );
    setMessage(payload?.error?.message ?? 'The change could not be saved.');
    return null;
  }

  return { saving, message, fieldErrors, send, setMessage };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
