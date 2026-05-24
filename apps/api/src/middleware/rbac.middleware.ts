import type { RequestHandler } from 'express';
import type { Role } from '@onboarding-diary/shared';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

export function rbac(allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
}
