import cors from 'cors';
import express, { type Express } from 'express';
import { config } from './config/env.js';
import { errorHandler } from './http/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { commentsRouter } from './modules/comments/comments.routes.js';
import { configRouter } from './modules/config/config.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { departmentsRouter } from './modules/departments/departments.routes.js';
import { feedbackRouter } from './modules/feedback/feedback.routes.js';
import { issuesRouter } from './modules/issues/issues.routes.js';
import { mentionsRouter } from './modules/mentions/mentions.routes.js';
import { notesRouter } from './modules/notes/notes.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { tasksRouter } from './modules/tasks/tasks.routes.js';
import { templatesRouter } from './modules/templates/templates.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

/** Builds the Express application. Exported so tests can mount it via Supertest. */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/config', configRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/departments', departmentsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/tasks/:taskId/comments', commentsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/issues', issuesRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/notes', notesRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/mentions', mentionsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);

  app.use(errorHandler);
  return app;
}
