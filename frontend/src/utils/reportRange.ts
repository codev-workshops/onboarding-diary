import { todayIso } from './dates';

export const MAX_REPORT_RANGE_DAYS = 366;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return todayIso(new Date(year, month - 1, day + days));
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
}

/** Returns an error message for an invalid range, or null. */
export function rangeError(from: string, to: string): string | null {
  if (!from || !to) return 'Choose both dates';
  if (from > to) return "'From' must not be after 'To'";
  if (daysBetween(from, to) >= MAX_REPORT_RANGE_DAYS) {
    return `The date range can be at most ${MAX_REPORT_RANGE_DAYS} days`;
  }
  return null;
}
