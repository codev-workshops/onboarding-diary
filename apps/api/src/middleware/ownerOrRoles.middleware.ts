import type { RequestHandler } from 'express';
import type { Role } from '@onboarding-diary/shared';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

/**
 * Allows access if the authenticated user owns the resource (req.params.id === req.user.id)
 * OR has one of the specified roles. Useful for "edit own profile or admin can edit anyone" patterns.
 */
export function ownerOrRoles(allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const isOwner = req.params.id === req.user.id;
    const hasRole = allowedRoles.includes(req.user.role);

    if (!isOwner && !hasRole) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
}
