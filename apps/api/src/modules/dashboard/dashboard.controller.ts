import type { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service.js';

export async function recruitDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dashboardService.getRecruitDashboard(req.user!.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function managerDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dashboardService.getManagerDashboard(req.user!.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function adminDashboard(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await dashboardService.getAdminDashboard();
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
