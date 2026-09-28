import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, filenameFromDisposition, saveDownloadedFile } from "@/lib/apiClient";
import type { Page, UserSummary } from "@/lib/apiClient";
import { ReportStore, reportErrorMessage, validateReportForm } from "@/stores/ReportStore";

const RECRUIT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

const recruit: UserSummary = {
  id: RECRUIT_ID,
  email: "r@example.com",
  fullName: "Rita Recruit",
  role: "NEW_RECRUIT",
  status: "ACTIVE",
  department: null,
  startDate: null,
};

function page<T>(items: T[]): Page<T> {
  return { items, page: 0, size: 100, totalItems: items.length, totalPages: 1 };
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
  });
}

function errorBody(code: string, message: string, details: unknown[] = []) {
  return { code, message, details, timestamp: "2026-01-01T00:00:00Z", path: "/api/v1/reports" };
}

const form = { recruitId: RECRUIT_ID, from: "2026-01-01", to: "2026-01-31", type: "COMBINED" as const, format: "PDF" as const };

describe("validateReportForm", () => {
  it("accepts a valid range and the 366-day maximum", () => {
    expect(validateReportForm(form, true)).toEqual({});
    expect(validateReportForm({ ...form, from: "2024-01-01", to: "2025-01-01" }, true)).toEqual({});
  });

  it("requires both dates and a recruit for managers/admins", () => {
    const errors = validateReportForm({ ...form, recruitId: "", from: "", to: "" }, true);
    expect(errors.recruitId).toMatch(/recruit/i);
    expect(errors.from).toMatch(/required/i);
    expect(errors.to).toMatch(/required/i);
    expect(validateReportForm({ ...form, recruitId: "" }, false)).toEqual({});
  });

  it("rejects from > to and spans over 366 days (INV-10)", () => {
    expect(validateReportForm({ ...form, from: "2026-02-01", to: "2026-01-31" }, true).to).toMatch(/on or after/);
    expect(validateReportForm({ ...form, from: "2024-01-01", to: "2025-01-02" }, true).to).toMatch(/366/);
    expect(validateReportForm({ ...form, from: "2026-02-30" }, true).from).toMatch(/valid date/);
  });
});

describe("filenameFromDisposition", () => {
  it("parses quoted, bare and RFC 5987 filenames", () => {
    expect(filenameFromDisposition('attachment; filename="onboarding-report-x-2026-01-01_2026-01-31.pdf"')).toBe(
      "onboarding-report-x-2026-01-01_2026-01-31.pdf",
    );
    expect(filenameFromDisposition("attachment; filename=report.csv")).toBe("report.csv");
    expect(filenameFromDisposition("attachment; filename*=UTF-8''r%C3%A9port.csv")).toBe("réport.csv");
    expect(filenameFromDisposition(null)).toBeNull();
  });
});

describe("ApiClient.download", () => {
  it("attaches the bearer token, returns the blob and the server filename", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("a,b\r\n", {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=UTF-8",
            "Content-Disposition": 'attachment; filename="onboarding-report-r-2026-01-01_2026-01-31.csv"',
            "X-Report-Omitted": "feedback",
          },
        }),
    );
    const api = new ApiClient("http://api", fetchImpl as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "tok", onUnauthorized: () => undefined });

    const report = await api.reports.generate({ recruitId: "r", from: "2026-01-01", to: "2026-01-31", type: "COMBINED", format: "CSV" });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api/api/v1/reports?recruitId=r&from=2026-01-01&to=2026-01-31&type=COMBINED&format=CSV");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(await report.blob.text()).toBe("a,b\r\n");
    expect(report.filename).toBe("onboarding-report-r-2026-01-01_2026-01-31.csv");
    expect(report.contentType).toBe("text/csv; charset=UTF-8");
    expect(report.feedbackOmitted).toBe(true);
  });

  it("maps error envelopes to ApiError instead of a file", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(403, errorBody("FORBIDDEN", "nope")));
    const api = new ApiClient("http://api", fetchImpl as unknown as typeof fetch);
    await expect(api.reports.generate({ from: "2026-01-01", to: "2026-01-31", type: "FEEDBACK", format: "PDF" })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});

describe("saveDownloadedFile", () => {
  it("is a no-op outside the browser", () => {
    expect(() =>
      saveDownloadedFile({ blob: new Blob(["x"]), filename: "x.csv", contentType: "text/csv", headers: new Headers() }),
    ).not.toThrow();
  });
});

describe("ReportStore", () => {
  let fetchImpl: ReturnType<typeof vi.fn>;
  let store: ReportStore;

  beforeEach(() => {
    fetchImpl = vi.fn();
    const api = new ApiClient("http://api", fetchImpl as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "tok", onUnauthorized: () => undefined });
    store = new ReportStore(api);
  });

  afterEach(() => vi.restoreAllMocks());

  it("scopes recruit options by role", async () => {
    fetchImpl.mockResolvedValueOnce(jsonResponse(200, page([{ recruit, assignedAt: "2026-01-01T00:00:00Z", openIssueCount: 0 }])));
    store.init("MANAGER");
    await vi.waitFor(() => expect(store.recruitsLoading).toBe(false));
    expect(String((fetchImpl.mock.calls[0] as unknown as [string])[0])).toContain("/api/v1/me/recruits");
    expect(store.recruits.map((r) => r.id)).toEqual([RECRUIT_ID]);
    expect(store.recruitRequired).toBe(true);

    fetchImpl.mockResolvedValueOnce(jsonResponse(200, page([recruit])));
    store.init("ADMIN", RECRUIT_ID);
    await vi.waitFor(() => expect(store.recruitsLoading).toBe(false));
    expect(String((fetchImpl.mock.calls[1] as unknown as [string])[0])).toContain("/api/v1/users?");
    expect(String((fetchImpl.mock.calls[1] as unknown as [string])[0])).toContain("role=NEW_RECRUIT");
    expect(store.form.recruitId).toBe(RECRUIT_ID);

    store.init("NEW_RECRUIT");
    expect(store.recruitRequired).toBe(false);
    expect(store.form.recruitId).toBe("");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("shows inline errors only after touch or submit and blocks generate", async () => {
    store.init("NEW_RECRUIT");
    store.setField("from", "");
    expect(store.errors.from).toBeDefined();
    expect(store.visibleErrors).toEqual({});
    store.touch("from");
    expect(store.visibleErrors.from).toMatch(/required/);

    expect(await store.generate()).toBe(false);
    expect(store.submitted).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("downloads on success and reports omitted feedback", async () => {
    fetchImpl.mockResolvedValueOnce(
      new Response("%PDF-1.7", {
        status: 200,
        headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="r.pdf"', "X-Report-Omitted": "feedback" },
      }),
    );
    store.init("NEW_RECRUIT");
    store.setField("from", "2026-01-01");
    store.setField("to", "2026-01-31");

    expect(await store.generate()).toBe(true);
    expect(store.generating).toBe(false);
    expect(store.error).toBeNull();
    expect(store.lastDownloaded).toBe("r.pdf");
    expect(store.feedbackOmitted).toBe(true);
    const url = String((fetchImpl.mock.calls[0] as unknown as [string])[0]);
    expect(url).not.toContain("recruitId=");
    expect(url).toContain("type=COMBINED&format=PDF");
  });

  it("surfaces a failure banner and retries with the same form", async () => {
    fetchImpl.mockResolvedValueOnce(jsonResponse(500, errorBody("INTERNAL_ERROR", "boom")));
    store.init("NEW_RECRUIT");
    store.setField("from", "2026-01-01");
    store.setField("to", "2026-01-31");

    expect(await store.generate()).toBe(false);
    expect(store.error).toMatch(/could not be generated/i);
    expect(store.lastDownloaded).toBeNull();

    fetchImpl.mockResolvedValueOnce(new Response("a", { status: 200, headers: { "Content-Type": "text/csv" } }));
    expect(await store.retry()).toBe(true);
    expect(store.error).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps 403 and validation errors to user copy", () => {
    expect(reportErrorMessage(new ApiError(403, "FORBIDDEN", "Forbidden"))).toMatch(/not allowed/);
    expect(reportErrorMessage(new ApiError(400, "VALIDATION_FAILED", "Validation failed", [{ field: "to", code: "OUT_OF_RANGE", message: "range must not exceed 366 days" }]))).toBe(
      "range must not exceed 366 days",
    );
    expect(reportErrorMessage(new Error("x"))).toMatch(/could not be generated/i);
  });

  it("clear() resets everything", () => {
    store.init("MANAGER", RECRUIT_ID);
    store.setField("type", "TASKS");
    store.clear();
    expect(store.role).toBeNull();
    expect(store.form.recruitId).toBe("");
    expect(store.form.type).toBe("COMBINED");
  });
});
