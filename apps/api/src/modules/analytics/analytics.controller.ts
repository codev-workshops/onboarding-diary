import type { Request, Response, NextFunction } from 'express';
import type { AnalyticsParamsSchema } from '@onboarding-diary/shared';
import * as analyticsService from './analytics.service.js';

export async function overview(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.query as unknown as AnalyticsParamsSchema;
    const result = await analyticsService.getAnalyticsOverview(
      params,
      req.user!.id,
      req.user!.role,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function taskTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.query as unknown as AnalyticsParamsSchema;
    const result = await analyticsService.getTaskCompletionTrends(
      params,
      req.user!.id,
      req.user!.role,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function issueTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.query as unknown as AnalyticsParamsSchema;
    const result = await analyticsService.getIssueTrends(
      params,
      req.user!.id,
      req.user!.role,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function feedbackSentiment(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.query as unknown as AnalyticsParamsSchema;
    const result = await analyticsService.getFeedbackSentiment(
      params,
      req.user!.id,
      req.user!.role,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function recruitActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.query as unknown as AnalyticsParamsSchema;
    const result = await analyticsService.getRecruitActivity(
      params,
      req.user!.id,
      req.user!.role,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
