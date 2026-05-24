export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const DIARY = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 255,
  BODY_MIN_LENGTH: 10,
  BODY_MAX_LENGTH: 50_000,
  MOOD_MIN: 1,
  MOOD_MAX: 5,
  MAX_TAGS: 10,
  TAG_MAX_LENGTH: 50,
  MAX_PAST_DAYS: 7,
} as const;

export const USER = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_MAX_LENGTH: 255,
  BIO_MAX_LENGTH: 500,
  DEPARTMENT_MAX_LENGTH: 100,
} as const;

export const COMMENT = {
  BODY_MIN_LENGTH: 1,
  BODY_MAX_LENGTH: 5_000,
} as const;

export const PROGRAM = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 5_000,
  MIN_DURATION_DAYS: 1,
  MAX_DURATION_DAYS: 365,
} as const;

export const MILESTONE = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2_000,
} as const;

export const ATTACHMENT = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_PER_ENTRY: 5,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ] as const,
} as const;
