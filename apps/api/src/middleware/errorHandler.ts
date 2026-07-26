import type { ErrorEnvelope } from '@onboarding-diary/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';

import {
  AppError,
  BadRequestError,
  NotFoundError,
  PayloadTooLargeError,
  translatePrismaError,
} from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';

type BodyParserError = { type?: string; status?: number };

function normalise(error: unknown): AppError | null {
  if (error instanceof AppError) return error;

  const translated = translatePrismaError(error);
  if (translated !== null) return translated;

  const candidate = error as BodyParserError;
  if (candidate.type === 'entity.too.large') return new PayloadTooLargeError();
  if (candidate.type === 'entity.parse.failed') return new BadRequestError('Malformed JSON body');
  return null;
}

/** 404 for unknown routes, so they flow through the standard envelope. */
export function notFoundHandler(): RequestHandler {
  return (req, _res, next) => {
    next(new NotFoundError(`No route matches ${req.method} ${req.path}`));
  };
}

/** The single place error responses are constructed (TRD 6.3). */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    if (res.headersSent) {
      logger.error(
        { requestId: req.requestId, err: error },
        'Error after response headers were sent',
      );
      res.destroy();
      return;
    }

    const appError = normalise(error);
    const status = appError?.status ?? 500;
    const body: ErrorEnvelope = {
      error: {
        code: appError?.code ?? 'INTERNAL_ERROR',
        message: appError?.message ?? 'An unexpected error occurred',
        requestId: req.requestId,
      },
    };
    if (appError?.details !== undefined && appError.details.length > 0) {
      body.error.details = appError.details;
    }

    if (status >= 500) {
      logger.error(
        {
          requestId: req.requestId,
          route: `${req.method} ${req.path}`,
          userId: req.user?.id ?? null,
          err: error,
        },
        'Unhandled error',
      );
    } else {
      logger.warn(
        { requestId: req.requestId, route: `${req.method} ${req.path}`, code: body.error.code },
        body.error.message,
      );
    }

    res.status(status).json(body);
  };
}
