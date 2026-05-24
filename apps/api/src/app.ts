import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { corsOptions } from './config/cors.js';
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { globalRateLimiter } from './middleware/rateLimiter.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { assignmentsRoutes } from './modules/assignments/assignments.routes.js';

const app = express();

// Global middleware
app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(globalRateLimiter);

// Health check
app.get(`${config.API_PREFIX}/health`, (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime(),
  });
});

// API routes
app.use(`${config.API_PREFIX}/auth`, authRoutes);
app.use(`${config.API_PREFIX}/users`, usersRoutes);
app.use(`${config.API_PREFIX}/assignments`, assignmentsRoutes);

// Catch-all and error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
