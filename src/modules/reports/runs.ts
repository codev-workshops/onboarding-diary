import type { ReportFormat, ReportRunStatus, ReportScopeType } from '@prisma/client';

import { prisma } from '@/src/shared/db/prisma';

/**
 * Report-run metadata (§21.1). This is not entry data — no titles, no bodies,
 * only the parameters a generation ran under — so it lives here rather than
 * behind the scoped repositories, and it is written for refused attempts too:
 * a manager probing for an out-of-scope recruit leaves a row (AZ-M6).
 */
export type ReportRunInput = {
  requestedById: string;
  scopeType: ReportScopeType;
  targetUserIds: string[];
  targetDepartmentId: string | null;
  dateFrom: Date;
  dateTo: Date;
  sections: string[];
  format: ReportFormat;
  rowCount: number;
  status: ReportRunStatus;
  errorCode: string | null;
  durationMs: number;
};

export async function recordReportRun(input: ReportRunInput): Promise<void> {
  await prisma.reportRun.create({ data: input });
}

/**
 * Best-effort, for the same reason the audit writes are: a failed metadata row
 * must not turn a report the caller was entitled to into a 500, nor mask the
 * 403 that a denied attempt should return.
 */
export function recordReportRunBestEffort(input: ReportRunInput): void {
  void recordReportRun(input).catch((error: unknown) => {
    console.error('Report run metadata write failed', error);
  });
}
