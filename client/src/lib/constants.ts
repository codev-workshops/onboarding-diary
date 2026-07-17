// Mirrors the server's Tier-2 enum value sets (docs/ASSUMPTIONS.md §4) for use in
// form controls. The server remains the source of truth and validates all input.

export const ROLES = ['Recruit', 'Manager', 'Admin'] as const;
export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ISSUE_STATUSES = ['Open', 'In Progress', 'Resolved'] as const;
export const FEEDBACK_TYPES = ['Positive', 'Suggestion', 'Concern'] as const;

export type Role = (typeof ROLES)[number];

/** The timezone assigned to users when an Admin does not choose one (§20). */
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// Common zones surfaced at the top of the Admin picker for quick access. `UTC` is
// included because the app stores/validates it as a canonical value even though
// `Intl.supportedValuesOf('timeZone')` omits it.
const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/Los_Angeles',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
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
  return [];
}

/** De-duplicates while preserving first-seen order. */
function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

// IANA timezones for the Admin user picker (docs/ASSUMPTIONS.md §20). Common zones
// (incl. `UTC`) lead the list, followed by the runtime's full set. The server
// accepts any valid IANA identifier, so this only drives the dropdown.
export const TIMEZONES = unique([...COMMON_TIMEZONES, ...supportedTimezones()]);

/**
 * Ensures a stored timezone is representable in the picker. A controlled
 * `<select>` whose value has no matching `<option>` silently displays the first
 * option, which would risk changing a user's zone on save — so we prepend any
 * missing stored value.
 */
export function timezoneOptions(current?: string): string[] {
  if (current && !TIMEZONES.includes(current)) return [current, ...TIMEZONES];
  return TIMEZONES;
}
