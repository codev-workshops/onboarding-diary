import type { Request } from 'express';

import type { Caller } from '../access/entryAccess.js';
import { UnauthenticatedError } from './errors.js';

/** The authenticated caller, for routes mounted behind `requireAuth`. */
export function callerOf(req: Request): Caller {
  if (req.user === undefined) throw new UnauthenticatedError('An access token is required');
  return req.user;
}
