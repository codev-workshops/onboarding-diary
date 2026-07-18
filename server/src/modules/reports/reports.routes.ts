import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../http/asyncHandler.js';
import { authenticate, requireUser, type AuthedRequest } from '../../http/authMiddleware.js';
import { buildReport, reportQuerySchema } from './reports.service.js';
import { csvFromReport } from './reports.csv.js';
import { pdfFromReport } from './reports.pdf.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

// On-screen report data (docs/ASSUMPTIONS.md §11).
reportsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const query = reportQuerySchema.parse(req.query);
    res.json(await buildReport(prisma, requireUser(req), query));
  }),
);

// Export the displayed report to CSV.
reportsRouter.get(
  '/export.csv',
  asyncHandler(async (req: AuthedRequest, res) => {
    const query = reportQuerySchema.parse(req.query);
    const report = await buildReport(prisma, requireUser(req), query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="onboarding-report.csv"');
    res.send(csvFromReport(report));
  }),
);

// Export the displayed report to PDF.
reportsRouter.get(
  '/export.pdf',
  asyncHandler(async (req: AuthedRequest, res) => {
    const query = reportQuerySchema.parse(req.query);
    const report = await buildReport(prisma, requireUser(req), query);
    const pdf = await pdfFromReport(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="onboarding-report.pdf"');
    res.send(pdf);
  }),
);
