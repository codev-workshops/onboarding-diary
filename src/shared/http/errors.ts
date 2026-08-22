/**
 * Application error codes. Every error the API returns carries one, and the
 * HTTP status is derived from it rather than chosen at the throw site.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 422,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  ACCOUNT_DEACTIVATED: 403,
  INSUFFICIENT_ROLE: 403,
  OUT_OF_SCOPE: 403,
  FIELD_NOT_PERMITTED: 403,
  FORBIDDEN_FIELD: 403,
  SECTION_NOT_PERMITTED: 403,
  EMAIL_ALREADY_REGISTERED: 409,
  UNSUPPORTED_MEDIA_TYPE: 415,
  MALFORMED_JSON: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export type ErrorDetail = {
  field: string;
  code: string;
  message?: string;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ErrorDetail[];

  constructor(code: ErrorCode, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_CODES[code];
    this.details = details;
  }
}

export const unauthenticated = (): AppError => new AppError('UNAUTHENTICATED', 'Authentication is required.');

/**
 * Identical for an unknown email and a wrong password, so the response cannot
 * be used to enumerate accounts (S12).
 */
export const invalidCredentials = (): AppError =>
  new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect.');
