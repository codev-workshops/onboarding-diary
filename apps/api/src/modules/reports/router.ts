import { createReportBody, REPORT_CONTENT_TYPES, reportFilename } from '@onboarding-diary/shared';
import { Router, type RequestHandler } from 'express';

import { callerOf } from '../../lib/caller.js';
import type { Db } from '../../lib/prisma.js';
import { defineRoute } from '../../middleware/validate.js';
import { assembleReport } from './assemble.js';
import { renderCsv } from './csv.js';
import { renderPdf } from './pdf.js';

export type ReportsRouterOptions = { reportRateLimiter: RequestHandler };

export function reportsRouter(db: Db, { reportRateLimiter }: ReportsRouterOptions): Router {
  const router = Router();

  router.post(
    '/',
    reportRateLimiter,
    defineRoute({ body: createReportBody }, async ({ body, req, res }) => {
      const data = await assembleReport(db, callerOf(req), body);
      const filename = reportFilename({
        fullName: data.owner.fullName,
        from: data.from,
        to: data.to,
        format: body.format,
      });

      res.setHeader('Content-Type', REPORT_CONTENT_TYPES[body.format]);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (body.format === 'CSV') {
        res.send(renderCsv(data));
        return;
      }
      res.send(await renderPdf(data));
    }),
  );

  return router;
}
