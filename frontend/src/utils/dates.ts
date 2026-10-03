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
