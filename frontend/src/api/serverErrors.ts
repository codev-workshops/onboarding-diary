import axios from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { getErrorMessage, getFieldErrors } from './errors';

/**
 * Shows server field errors on the matching form fields and returns a message for anything that
 * cannot be attached to a field (conflicts, unknown fields, network errors).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
  fallback: string,
): string | null {
  const fieldErrors = getFieldErrors(error);
  const attached = fieldErrors.filter((fieldError) => knownFields.includes(fieldError.field));
  attached.forEach((fieldError) =>
    setError(fieldError.field as Path<T>, { type: 'server', message: fieldError.message }),
  );
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    return getErrorMessage(error, fallback);
  }
  if (attached.length > 0 && attached.length === fieldErrors.length) return null;
  return getErrorMessage(error, fallback);
}

export function isConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}
