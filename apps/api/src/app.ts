import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import type { AppConfig } from './config.js';
import { createLogger, type Logger } from './lib/logger.js';
import type { Db } from './lib/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimiter, noRateLimit, RATE_LIMITS } from './middleware/rateLimit.js';
import { requestId, requestLogger } from './middleware/requestContext.js';
import { requireAuth } from './middleware/requireAuth.js';
import { authRouter } from './modules/auth/router.js';
import { dashboardRouter } from './modules/dashboard/router.js';
import { feedbackRouter } from './modules/feedback/router.js';
import { healthRouter } from './modules/health/router.js';
import { issuesRouter } from './modules/issues/router.js';
import { notesRouter } from './modules/notes/router.js';
import { reportsRouter } from './modules/reports/router.js';
import { tasksRouter } from './modules/tasks/router.js';
import { usersRouter } from './modules/users/router.js';

export const API_BASE_PATH = '/api/v1';
export const BODY_LIMIT = '256kb';

export type CreateAppOptions = {
  db: Db;
  config: AppConfig;
  logger?: Logger;
  /** Disabled by default in tests so suites are not throttled (T-049 opts back in). */
  rateLimitsEnabled?: boolean;
};

export function createApp({
  db,
  config,
  logger = createLogger(config),
  rateLimitsEnabled = config.NODE_ENV !== 'test',
}: CreateAppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId());
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(cookieParser());

  const limiter = (profile: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS]) =>
    rateLimitsEnabled ? createRateLimiter(profile) : noRateLimit;

  const auth = requireAuth(config);

  app.use(healthRouter(db));
  app.use(API_BASE_PATH, limiter(RATE_LIMITS.global));
  app.use(
    `${API_BASE_PATH}/auth`,
    authRouter(db, config, { authRateLimiter: limiter(RATE_LIMITS.auth), requireAuth: auth }),
  );

  // Everything below this point requires an authenticated caller (TRD 4).
  app.use(`${API_BASE_PATH}/users`, auth, usersRouter(db));
  app.use(`${API_BASE_PATH}/tasks`, auth, tasksRouter(db));
  app.use(`${API_BASE_PATH}/issues`, auth, issuesRouter(db));
  app.use(`${API_BASE_PATH}/feedback`, auth, feedbackRouter(db));
  app.use(`${API_BASE_PATH}/notes`, auth, notesRouter(db));
  app.use(`${API_BASE_PATH}/dashboard`, auth, dashboardRouter(db));
  app.use(
    `${API_BASE_PATH}/reports`,
    auth,
    reportsRouter(db, { reportRateLimiter: limiter(RATE_LIMITS.reports) }),
  );

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return app;
}
