import type { RequestHandler } from 'express';
import { Role } from '@onboarding-diary/shared';
import { UnauthorizedError } from '../errors/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role as Role,
    };
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token', 'TOKEN_EXPIRED');
  }
};
