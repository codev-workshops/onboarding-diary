import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from './errors.js';

/** Consistent error envelope: `{ error: { message, details? } }`. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: 'Validation failed', details: err.flatten() } });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: { message } });
}
