const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMidnight(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** 1-based onboarding day: the start date is day 1. Zero or negative means not started yet. */
export function onboardingDay(startDate: string, today: Date = new Date()): number {
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((todayUtc - toUtcMidnight(startDate)) / MS_PER_DAY) + 1;
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today's date in the user's local time zone as YYYY-MM-DD. */
export function todayIso(today: Date = new Date()): string {
  return toIsoDate(today);
}

/** Earliest allowed diary entry date: 30 days before the start date. */
export function earliestEntryDate(startDate: string): string {
  const [year, month, day] = startDate.split('-').map(Number);
  return toIsoDate(new Date(year, month - 1, day - 30));
}
