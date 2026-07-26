import type { Role } from '@onboarding-diary/shared';
import type { RequestHandler } from 'express';

import { ForbiddenError, UnauthenticatedError } from '../lib/errors.js';

/** Gate a route on the caller's role, producing 403 `FORBIDDEN`. */
export function requireRole(...allowed: readonly Role[]): RequestHandler {
  return (req, _res, next) => {
    if (req.user === undefined) {
      next(new UnauthenticatedError('An access token is required'));
      return;
    }
    next(
      allowed.includes(req.user.role)
        ? undefined
        : new ForbiddenError('Your role does not permit this operation'),
    );
  };
}
