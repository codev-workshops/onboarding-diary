import type { ApiTransport, DownloadedFile } from "@/lib/api/core";
import { toQuery } from "@/lib/api/core";

// ---- S8: reports (docs/openapi.yaml `/reports`) ------------------------------

export const REPORT_TYPES = ["TASKS", "ISSUES", "FEEDBACK", "COMBINED"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_FORMATS = ["PDF", "CSV"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

/** INV-10 upper bound on `to - from`, inclusive. */
export const REPORT_MAX_SPAN_DAYS = 366;

export interface ReportQuery {
  /** Recruit → optional (self); manager/admin → required. */
  recruitId?: string;
  /** ISO date `YYYY-MM-DD`. */
  from: string;
  to: string;
  type: ReportType;
  format: ReportFormat;
}

export interface GeneratedReport extends DownloadedFile {
  /** `true` when the server sent `X-Report-Omitted: feedback` (COMBINED without feedback visibility). */
  feedbackOmitted: boolean;
}

export function reportFilename(query: ReportQuery): string {
  return `onboarding-report-${query.recruitId ?? "me"}-${query.from}_${query.to}.${query.format.toLowerCase()}`;
}

export class ReportsApi {
  constructor(private readonly transport: ApiTransport) {}

  /** operationId: generateReport — fetches the document as a Blob (bearer attached by the transport). */
  async generate(query: ReportQuery): Promise<GeneratedReport> {
    const file = await this.transport.download(`/reports${toQuery(query)}`, reportFilename(query));
    return { ...file, feedbackOmitted: file.headers.get("X-Report-Omitted")?.toLowerCase().includes("feedback") ?? false };
  }
}
