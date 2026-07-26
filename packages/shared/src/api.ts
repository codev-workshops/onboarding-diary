/** Response envelopes and the error contract shared by the API and the web app. */

import { z } from 'zod';

export const ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_ALREADY_EXISTS',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.array(fieldErrorSchema).optional(),
    requestId: z.string(),
  }),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export type DataEnvelope<T> = { data: T };

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export type PaginatedEnvelope<T> = { data: T[]; meta: PaginationMeta };
