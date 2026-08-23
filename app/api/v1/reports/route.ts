import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { contentDisposition, renderCsv } from '@/src/modules/reports/csv';
import { renderPdf } from '@/src/modules/reports/pdf';
import { reportRequestSchema } from '@/src/modules/reports/schemas';
import { buildReport } from '@/src/modules/reports/service';
import { ok, readJson, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One endpoint for preview and export (O4): the request that renders the
 * on-screen report and the request that downloads it differ only in `format`,
 * and splitting them was two chances for the two to disagree about scope.
 *
 * It is a POST despite being a read because the request body is a structured
 * object — a report request does not survive a query string, and a URL that
 * lists the recruits somebody reported on is a URL that ends up in logs and
 * browser history.
 */
export const POST = route(async (request) => {
  const actor = await requireCurrentUser(request);
  const body = await readJson(request, reportRequestSchema);
  const report = await buildReport(actor, body);

  if (body.format === 'JSON') return ok(report);

  const [payload, contentType, extension] =
    body.format === 'PDF'
      ? // `.slice()` hands the response the exact bytes rather than whatever
        // backing buffer the renderer happened to allocate.
        ([(await renderPdf(report)).slice().buffer as ArrayBuffer, 'application/pdf', 'pdf'] as const)
      : ([renderCsv(report), 'text/csv; charset=utf-8', 'csv'] as const);

  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition(`${report.filename_base}.${extension}`),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
