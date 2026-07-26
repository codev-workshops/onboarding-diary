import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';

import type { Logger } from '../lib/logger.js';

/** Attach a `requestId` to every request and echo it back for support (TRD 6.1). */
export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    req.requestId = incoming !== undefined && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  };
}

/** Structured request logging: method, path, status, duration, and `requestId`. */
export function requestLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req) => (req as { requestId?: string }).requestId ?? randomUUID(),
    customProps: (req) => ({ userId: (req as { user?: { id: string } }).user?.id ?? null }),
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  });
}
