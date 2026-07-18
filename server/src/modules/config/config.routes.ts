import { Router } from 'express';
import { activeDatasource, config, onboardingEnablersEnabled } from '../../config/env.js';
import { getDemoCredentials } from '../../domain/demo.js';
import { ApiError } from '../../http/errors.js';

export const configRouter = Router();

/**
 * Public runtime config used by the client to decide whether to show onboarding
 * enablers and which datasource is active (docs/ASSUMPTIONS.md §2, §13).
 */
configRouter.get('/', (_req, res) => {
  res.json({
    demoMode: config.demoMode,
    onboardingEnablersEnabled: onboardingEnablersEnabled(),
    datasource: activeDatasource(),
  });
});

/**
 * Demo credentials helper for the onboarding UI. Hard-gated to demo mode: returns
 * the static `@demo.local` account list + demo password only when onboarding
 * enablers are active, and 404 otherwise (docs/ASSUMPTIONS.md §16).
 */
configRouter.get('/demo', (_req, res) => {
  const credentials = getDemoCredentials();
  if (!credentials) throw ApiError.notFound('Demo credentials are not available');
  res.json(credentials);
});
