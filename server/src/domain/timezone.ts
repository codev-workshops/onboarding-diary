/**
 * Timezone support (docs/ASSUMPTIONS.md §20). Each user has an IANA timezone that
 * is provisioned and edited by an Admin only (there is no self-service profile),
 * and it drives end-of-day overdue evaluation for that user's tasks.
 */

/** Default timezone assigned to users when one is not specified. */
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Returns true when `timeZone` is a valid IANA identifier the runtime can resolve.
 * Uses the Intl API, which throws a RangeError for unknown zones.
 */
export function isValidTimezone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}
