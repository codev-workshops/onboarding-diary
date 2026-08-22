type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: { field?: string; message?: string }[];
  };
};

export type PostResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string; fieldErrors: Record<string, string> };

/**
 * Posts JSON and flattens the API error envelope into something a form can
 * render. Cookies are set by the server, so nothing about the session is
 * touched here (S2).
 */
export async function postJson<T>(url: string, body: unknown): Promise<PostResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
      fieldErrors: {},
    };
  }

  if (response.ok) {
    const payload = response.status === 204 ? null : ((await response.json()) as { data: T });
    return { ok: true, data: payload?.data as T };
  }

  const envelope = (await response.json().catch(() => ({}))) as ErrorEnvelope;
  const fieldErrors: Record<string, string> = {};
  for (const detail of envelope.error?.details ?? []) {
    if (detail.field && detail.message && !fieldErrors[detail.field]) {
      fieldErrors[detail.field] = detail.message;
    }
  }

  return {
    ok: false,
    code: envelope.error?.code ?? 'INTERNAL_ERROR',
    message: envelope.error?.message ?? 'Something went wrong. Please try again.',
    fieldErrors,
  };
}
