import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type JwtPayload } from '../auth/jwt.js';
import type { Role } from '../domain/enums.js';
import { ApiError } from './errors.js';

/** Express request augmented with the authenticated user (set by `authenticate`). */
export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

/** Verifies the Bearer token and attaches the decoded user to the request. */
export function authenticate(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  next();
}

/** Restricts a route to the given roles (docs/ASSUMPTIONS.md §7). */
export function authorize(...roles: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have access to this resource');
    }
    next();
  };
}

/** Returns the authenticated user or throws (for use inside handlers). */
export function requireUser(req: AuthedRequest): JwtPayload {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
