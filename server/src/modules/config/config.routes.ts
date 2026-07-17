import { Router } from 'express';
import { activeDatasource, config, onboardingEnablersEnabled } from '../../config/env.js';

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
