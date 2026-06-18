import { apiClient } from "./client";

export type ReportType = "TASKS" | "ISSUES" | "FEEDBACK" | "COMBINED";
export type ReportFormat = "CSV" | "PDF";

export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  dateFrom?: string;
  dateTo?: string;
  ownerId?: number;
}

export interface ReportFile {
  blob: Blob;
  filename: string;
}

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return match ? match[1] : fallback;
}

export const reportsApi = {
  download: async (request: ReportRequest): Promise<ReportFile> => {
    const params: Record<string, string> = {
      type: request.type,
      format: request.format,
    };
    if (request.dateFrom) params.dateFrom = request.dateFrom;
    if (request.dateTo) params.dateTo = request.dateTo;
    if (request.ownerId != null) params.ownerId = String(request.ownerId);

    const response = await apiClient.get("/reports", { params, responseType: "blob" });
    const extension = request.format === "PDF" ? "pdf" : "csv";
    const fallback = `${request.type.toLowerCase()}-report.${extension}`;
    return {
      blob: response.data as Blob,
      filename: filenameFromDisposition(response.headers["content-disposition"], fallback),
    };
  },
};

export function triggerDownload(file: ReportFile): void {
  const url = window.URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
