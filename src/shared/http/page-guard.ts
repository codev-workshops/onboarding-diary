import { notFound } from 'next/navigation';

import { AppError } from '@/src/shared/http/errors';

const DENIALS = new Set(['OUT_OF_SCOPE', 'NOT_FOUND', 'INSUFFICIENT_ROLE']);

/**
 * A page cannot answer with a 403 body, so every denial a service raises turns
 * into the same not-found screen. The API keeps the §11.7 distinction; this
 * only decides what a browser is shown, and collapsing the cases means the URL
 * cannot be used to tell "you may not" apart from "does not exist".
 *
 * Only the service's own denials are translated. Anything else rethrows to the
 * error boundary rather than being disguised as a missing page.
 */
export async function pageOr404<T>(load: Promise<T>): Promise<T> {
  try {
    return await load;
  } catch (error) {
    if (error instanceof AppError && DENIALS.has(error.code)) notFound();
    throw error;
  }
}
