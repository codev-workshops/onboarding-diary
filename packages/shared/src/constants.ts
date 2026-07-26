/** Field limits and pagination bounds shared by validation on both sides of the wire. */

export const TITLE_MAX_LENGTH = 200;
export const TEXT_MAX_LENGTH = 5000;
export const NOTE_CONTENT_MAX_LENGTH = 20_000;
export const TAG_MAX_LENGTH = 40;
export const TAGS_MAX_COUNT = 20;
export const FULL_NAME_MAX_LENGTH = 120;
export const DEPARTMENT_MAX_LENGTH = 80;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Longest date range a single report may span (TRD 4.6). */
export const MAX_REPORT_RANGE_DAYS = 366;
