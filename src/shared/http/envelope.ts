import { NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type output } from 'zod';

import { recordAuditBestEffort } from '@/src/modules/audit/service';
import { AppError, type ErrorDetail } from '@/src/shared/http/errors';
import { requestContextFrom, withRequestContext } from '@/src/shared/http/request-context';

/** Every denial that is worth an intrusion-detection signal (§22.1). */
const AUDITED_DENIALS = new Set([
  'OUT_OF_SCOPE',
  'INSUFFICIENT_ROLE',
  'FIELD_NOT_PERMITTED',
  'FORBIDDEN_FIELD',
  'SECTION_NOT_PERMITTED',
]);

export type SuccessBody<T> = { data: T };

export type ErrorBody = {
  error: {
    code: string;
    message: string;
    request_id: string;
    details: ErrorDetail[];
  };
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse<SuccessBody<T>> {
  return NextResponse.json({ data }, init);
}

function zodDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(body)',
    code: issue.code.toUpperCase(),
    message: issue.message,
  }));
}

/**
 * Wraps a route handler so every failure leaves as the same envelope. Unknown
 * errors are logged server-side and reported as a bare 500 — no stack trace,
 * SQL or path ever reaches the client (S14).
 */
export function route<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<NextResponse>
): (request: Request, ...args: Args) => Promise<NextResponse> {
  return async (request, ...args) => {
    const requestId = crypto.randomUUID();

    return withRequestContext(requestContextFrom(request, requestId), async () => {
      try {
        return await handler(request, ...args);
      } catch (error) {
        const appError =
          error instanceof ZodError
            ? new AppError('VALIDATION_ERROR', 'The request contains invalid fields.', zodDetails(error))
            : error instanceof AppError
              ? error
              : null;

        if (!appError) {
          console.error(`[${requestId}] Unhandled error on ${request.method} ${request.url}`, error);
          return NextResponse.json<ErrorBody>(
            {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Something went wrong. Please try again.',
                request_id: requestId,
                details: [],
              },
            },
            { status: 500 }
          );
        }

        // The wrapper is the only place that sees every denial, whichever guard
        // raised it, so AUTHZ.DENIED is recorded here rather than in each guard.
        if (AUDITED_DENIALS.has(appError.code)) {
          recordAuditBestEffort({
            action: 'AUTHZ.DENIED',
            entityType: 'REQUEST',
            before: { method: request.method, path: new URL(request.url).pathname, code: appError.code },
          });
        }

        return NextResponse.json<ErrorBody>(
          {
            error: {
              code: appError.code,
              message: appError.message,
              request_id: requestId,
              details: appError.details,
            },
          },
          { status: appError.status }
        );
      }
    });
  };
}

/**
 * Requiring the JSON content type is what lets a `SameSite=Lax` cookie stand in
 * for CSRF tokens: a cross-site form post cannot set it. Every state-changing
 * handler must call this, including the ones that read no body.
 */
export function requireJsonContentType(request: Request): void {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Requests must use Content-Type: application/json.');
  }
}

/** Reads a JSON body under a strict schema. */
export async function readJson<Schema extends ZodTypeAny>(
  request: Request,
  schema: Schema
): Promise<output<Schema>> {
  requireJsonContentType(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError('MALFORMED_JSON', 'The request body is not valid JSON.');
  }

  return schema.parse(body);
}
