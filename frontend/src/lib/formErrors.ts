import { ApiError, type FormErrors } from "@/lib/apiClient";

export const EMPTY_ERRORS: FormErrors = { fields: {} };

/** Turns any thrown value into form errors; ApiError keeps its field details. */
export function toFormErrors(e: unknown): FormErrors {
  if (e instanceof ApiError) return e.toFormErrors();
  return { form: e instanceof Error ? e.message : "Something went wrong", fields: {} };
}
