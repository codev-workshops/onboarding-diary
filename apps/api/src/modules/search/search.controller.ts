import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@onboarding-diary/shared';
import * as searchService from './search.service.js';

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await searchService.globalSearch(
      req.query as never,
      req.user!.id,
      req.user!.role as Role,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
