// Mirrors the server's Tier-2 enum value sets (docs/ASSUMPTIONS.md §4) for use in
// form controls. The server remains the source of truth and validates all input.

export const ROLES = ['Recruit', 'Manager', 'Admin'] as const;
export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ISSUE_STATUSES = ['Open', 'In Progress', 'Resolved'] as const;
export const FEEDBACK_TYPES = ['Positive', 'Suggestion', 'Concern'] as const;

export type Role = (typeof ROLES)[number];

// IANA timezones for the Admin user picker (docs/ASSUMPTIONS.md §20). Prefers the
// runtime's full list when available, falling back to a curated shortlist. The
// server accepts any valid IANA identifier, so this only drives the dropdown.
const FALLBACK_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function supportedTimezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  try {
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) return zones;
  } catch {
    // fall through to the curated list
  }
  return FALLBACK_TIMEZONES;
}

export const TIMEZONES = supportedTimezones();
export const DEFAULT_TIMEZONE = 'UTC';
