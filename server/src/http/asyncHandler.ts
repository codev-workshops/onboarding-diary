import type { NextFunction, Request, Response } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async route so rejected promises are forwarded to Express error handling. */
export function asyncHandler(fn: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
