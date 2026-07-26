/** Typed application errors and the mapping to HTTP status codes (TRD 6.2, 6.3). */

import type { ErrorCode, FieldError } from '@onboarding-diary/shared';

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: ErrorCode;
  readonly details?: FieldError[];

  constructor(message: string, details?: FieldError[]) {
    super(message);
    this.name = new.target.name;
    if (details !== undefined) this.details = details;
  }
}

export class BadRequestError extends AppError {
  readonly status = 400;
  readonly code = 'BAD_REQUEST' as const;
  constructor(message = 'The request could not be parsed') {
    super(message);
  }
}

export class UnauthenticatedError extends AppError {
  readonly status = 401;
  readonly code = 'UNAUTHENTICATED' as const;
  constructor(message = 'Authentication is required') {
    super(message);
  }
}

export class InvalidCredentialsError extends AppError {
  readonly status = 401;
  readonly code = 'INVALID_CREDENTIALS' as const;
  constructor(message = 'Email or password is incorrect') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = 'FORBIDDEN' as const;
  constructor(message = 'You do not have access to this resource') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND' as const;
  constructor(message = 'Resource not found') {
    super(message);
  }
}

export class EmailAlreadyExistsError extends AppError {
  readonly status = 409;
  readonly code = 'EMAIL_ALREADY_EXISTS' as const;
  constructor(message = 'An account with this email already exists') {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = 'CONFLICT' as const;
  constructor(message = 'The request conflicts with the current state') {
    super(message);
  }
}

export class PayloadTooLargeError extends AppError {
  readonly status = 413;
  readonly code = 'PAYLOAD_TOO_LARGE' as const;
  constructor(message = 'Request body is too large') {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly status = 422;
  readonly code = 'VALIDATION_ERROR' as const;
  constructor(message = 'Request validation failed', details: FieldError[] = []) {
    super(message, details);
  }
}

export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly code = 'RATE_LIMITED' as const;
  constructor(message = 'Too many requests, please retry later') {
    super(message);
  }
}

export class ServiceUnavailableError extends AppError {
  readonly status = 503;
  readonly code = 'SERVICE_UNAVAILABLE' as const;
  constructor(message = 'Service temporarily unavailable') {
    super(message);
  }
}

type PrismaLikeError = { code: string; meta?: { target?: unknown } };

function isPrismaKnownError(error: unknown): error is PrismaLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    /^P\d{4}$/.test((error as { code: string }).code)
  );
}

/**
 * Translate a Prisma error into an `AppError` so raw database errors never reach the
 * client. Returns `null` for anything that is not a recognised Prisma error.
 */
export function translatePrismaError(error: unknown): AppError | null {
  if (!isPrismaKnownError(error)) return null;
  switch (error.code) {
    case 'P2002':
      return new ConflictError('A record with these values already exists');
    case 'P2025':
      return new NotFoundError();
    case 'P2003':
      return new ConflictError('Related records prevent this operation');
    case 'P1001':
    case 'P1002':
      return new ServiceUnavailableError('Database unreachable');
    default:
      return null;
  }
}
