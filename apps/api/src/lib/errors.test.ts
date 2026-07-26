import { describe, expect, it } from 'vitest';

import {
  BadRequestError,
  ConflictError,
  EmailAlreadyExistsError,
  ForbiddenError,
  InvalidCredentialsError,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitedError,
  ServiceUnavailableError,
  UnauthenticatedError,
  ValidationError,
  translatePrismaError,
} from './errors.js';

describe('AppError subclasses', () => {
  it.each([
    [new BadRequestError(), 400, 'BAD_REQUEST'],
    [new UnauthenticatedError(), 401, 'UNAUTHENTICATED'],
    [new InvalidCredentialsError(), 401, 'INVALID_CREDENTIALS'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new NotFoundError(), 404, 'NOT_FOUND'],
    [new EmailAlreadyExistsError(), 409, 'EMAIL_ALREADY_EXISTS'],
    [new ConflictError(), 409, 'CONFLICT'],
    [new PayloadTooLargeError(), 413, 'PAYLOAD_TOO_LARGE'],
    [new ValidationError(), 422, 'VALIDATION_ERROR'],
    [new RateLimitedError(), 429, 'RATE_LIMITED'],
    [new ServiceUnavailableError(), 503, 'SERVICE_UNAVAILABLE'],
  ])('maps %s to its documented status and code', (error, status, code) => {
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('carries validation details', () => {
    const error = new ValidationError('Request validation failed', [
      { field: 'title', message: 'Title is required' },
    ]);
    expect(error.details).toEqual([{ field: 'title', message: 'Title is required' }]);
  });
});

describe('translatePrismaError', () => {
  it('maps unique-constraint violations to a conflict', () => {
    expect(translatePrismaError({ code: 'P2002' })).toBeInstanceOf(ConflictError);
  });

  it('maps missing records to a 404', () => {
    expect(translatePrismaError({ code: 'P2025' })).toBeInstanceOf(NotFoundError);
  });

  it('maps connection failures to 503', () => {
    expect(translatePrismaError({ code: 'P1001' })).toBeInstanceOf(ServiceUnavailableError);
  });

  it('ignores anything that is not a known Prisma error', () => {
    expect(translatePrismaError(new Error('boom'))).toBeNull();
    expect(translatePrismaError({ code: 'NOPE' })).toBeNull();
    expect(translatePrismaError(null)).toBeNull();
  });
});
