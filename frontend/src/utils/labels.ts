export type ChipColor =
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

/** Turns an enum constant such as IN_PROGRESS into "In progress". */
export function enumLabel(value: string): string {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const COLORS: Record<string, ChipColor> = {
  TODO: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  BLOCKED: 'error',
  OPEN: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
  POSITIVE: 'success',
  SUGGESTION: 'info',
  CONCERN: 'warning',
};

export function enumColor(value: string): ChipColor {
  return COLORS[value] ?? 'default';
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
