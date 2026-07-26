import { describe, expect, it } from 'vitest';

import { errorEnvelopeSchema } from './api.js';

describe('errorEnvelopeSchema', () => {
  it('accepts a validation error with field details', () => {
    const parsed = errorEnvelopeSchema.parse({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ field: 'title', message: 'Title is required' }],
        requestId: 'b3f0a2d4',
      },
    });
    expect(parsed.error.details).toHaveLength(1);
  });

  it('accepts an error without details', () => {
    expect(
      errorEnvelopeSchema.safeParse({
        error: { code: 'FORBIDDEN', message: 'Nope', requestId: 'r1' },
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown code', () => {
    expect(
      errorEnvelopeSchema.safeParse({
        error: { code: 'TEAPOT', message: 'Nope', requestId: 'r1' },
      }).success,
    ).toBe(false);
  });
});
