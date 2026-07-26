import type { ReactNode } from 'react';

import { ReportBuilder } from './ReportBuilder.js';

export function ReportsPage(): ReactNode {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-600">
          Export your diary for a date range as a CSV or PDF file.
        </p>
      </div>
      <ReportBuilder />
    </section>
  );
}
