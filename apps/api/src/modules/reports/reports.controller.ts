import type { Request, Response, NextFunction } from 'express';
import type { Role, ExportFormat } from '@onboarding-diary/shared';
import * as reportsService from './reports.service.js';

export async function generate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.generateReport(
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
    const result = await reportsService.updateReport(
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
    await reportsService.deleteReport(
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
    const result = await reportsService.getReportById(
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
    const result = await reportsService.listReports(
      req.query as never,
      req.user!.id,
      req.user!.role as Role,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const format = (req.query.format as string).toUpperCase() as ExportFormat;
    const result = await reportsService.downloadReport(
      req.params.id as string,
      format,
      req.user!.id,
      req.user!.role as Role,
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  } catch (err) {
    next(err);
  }
}
