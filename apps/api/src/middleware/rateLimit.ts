/** Rate limits for auth, reports, and overall traffic (TRD 5.4). */

import type { Request, RequestHandler, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { RateLimitedError } from '../lib/errors.js';

export type RateLimitProfile = { windowMs: number; limit: number };

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, limit: 10 },
  reports: { windowMs: 60 * 1000, limit: 5 },
  global: { windowMs: 60 * 1000, limit: 300 },
} as const satisfies Record<string, RateLimitProfile>;

function keyForCallerOrIp(req: Request): string {
  return req.user?.id ?? ipKeyGenerator(req.ip ?? '0.0.0.0');
}

export function createRateLimiter(profile: RateLimitProfile): RequestHandler {
  return rateLimit({
    windowMs: profile.windowMs,
    limit: profile.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: keyForCallerOrIp,
    handler: (_req: Request, res: Response, next) => {
      res.setHeader('Retry-After', Math.ceil(profile.windowMs / 1000));
      next(new RateLimitedError());
    },
  });
}

/** A pass-through used when rate limiting is disabled, e.g. in most tests. */
export const noRateLimit: RequestHandler = (_req, _res, next) => {
  next();
};
