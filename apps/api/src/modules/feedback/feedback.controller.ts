import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@onboarding-diary/shared';
import * as feedbackService from './feedback.service.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await feedbackService.createFeedback(
      req.user!.id,
      req.user!.role as Role,
      req.body,
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await feedbackService.updateFeedback(
      req.params.id as string,
      req.body,
      req.user!.id,
      req.user!.role as Role,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await feedbackService.deleteFeedback(
      req.params.id as string,
      req.user!.id,
      req.user!.role as Role,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await feedbackService.getFeedbackById(
      req.params.id as string,
      req.user!.id,
      req.user!.role as Role,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await feedbackService.listFeedback(
      req.query as never,
      req.user!.id,
      req.user!.role as Role,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
