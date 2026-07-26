import { loginBody, signupBody } from '@onboarding-diary/shared';
import { Router, type CookieOptions, type RequestHandler, type Response } from 'express';

import type { AppConfig } from '../../config.js';
import { UnauthenticatedError } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../../lib/refreshToken.js';
import { defineRoute } from '../../middleware/validate.js';
import { toUserDto } from '../../serializers/user.js';
import * as authService from './service.js';

function refreshCookieOptions(config: AppConfig, expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    expires,
  };
}

function setRefreshCookie(res: Response, config: AppConfig, result: authService.AuthResult): void {
  res.cookie(
    REFRESH_COOKIE_NAME,
    result.refresh.token,
    refreshCookieOptions(config, result.refresh.expiresAt),
  );
}

function readRefreshToken(cookies: unknown): string | undefined {
  if (typeof cookies !== 'object' || cookies === null) return undefined;
  const value = (cookies as Record<string, unknown>)[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function authRouter(
  db: Db,
  config: AppConfig,
  deps: { authRateLimiter: RequestHandler; requireAuth: RequestHandler },
): Router {
  const router = Router();

  router.post(
    '/signup',
    deps.authRateLimiter,
    defineRoute({ body: signupBody }, async ({ body, res }) => {
      const result = await authService.signup(db, config, body);
      setRefreshCookie(res, config, result);
      res.status(201).json({ data: { user: result.user, ...result.access } });
    }),
  );

  router.post(
    '/login',
    deps.authRateLimiter,
    defineRoute({ body: loginBody }, async ({ body, res }) => {
      const result = await authService.login(db, config, body);
      setRefreshCookie(res, config, result);
      res.json({ data: { user: result.user, ...result.access } });
    }),
  );

  router.post('/refresh', async (req, res) => {
    const presented = readRefreshToken(req.cookies);
    if (presented === undefined) throw new UnauthenticatedError('Refresh token is missing');
    const result = await authService.refresh(db, config, presented);
    setRefreshCookie(res, config, result);
    res.json({ data: { user: result.user, ...result.access } });
  });

  router.post('/logout', async (req, res) => {
    await authService.logout(db, readRefreshToken(req.cookies));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    res.status(204).send();
  });

  router.get('/me', deps.requireAuth, async (req, res) => {
    const callerId = req.user?.id;
    if (callerId === undefined) throw new UnauthenticatedError('An access token is required');
    const user = await db.user.findUnique({ where: { id: callerId } });
    if (user === null || !user.isActive) {
      throw new UnauthenticatedError('This account can no longer be used');
    }
    res.json({ data: toUserDto(user) });
  });

  return router;
}
