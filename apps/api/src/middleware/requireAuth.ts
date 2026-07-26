import type { RequestHandler } from 'express';

import type { AppConfig } from '../config.js';
import { verifyAccessToken } from '../lib/accessToken.js';
import { UnauthenticatedError } from '../lib/errors.js';

const BEARER = /^Bearer (.+)$/;

/** Populate `req.user` from the bearer token; 401 otherwise (AC-11). */
export function requireAuth(
  config: Pick<AppConfig, 'JWT_SECRET' | 'ACCESS_TOKEN_TTL'>,
): RequestHandler {
  return (req, _res, next) => {
    const header = req.get('authorization');
    const match = header === undefined ? null : BEARER.exec(header);
    if (match === null) {
      next(new UnauthenticatedError('An access token is required'));
      return;
    }
    try {
      const claims = verifyAccessToken(config, match[1] ?? '');
      req.user = { id: claims.sub, role: claims.role };
      next();
    } catch (error) {
      next(error);
    }
  };
}
