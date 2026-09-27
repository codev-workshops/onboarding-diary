import { describe, expect, it } from "vitest";
import { ApiError, type IssueStatus } from "@/lib/apiClient";
import { toFormErrors } from "@/lib/formErrors";
import {
  issueFields,
  maxEntryDate,
  requiresResolutionNotes,
  toCreateRequest,
  todayUtc,
  toUpdateRequest,
  validateIssue,
} from "@/features/issues/issueForm";

const valid = { entryDate: todayUtc(), title: "VPN keeps dropping", description: "", severity: "HIGH", status: "OPEN", resolutionNotes: "" };

describe("validateIssue (client-side mirror of the backend rules)", () => {
  it("accepts a valid form", () => {
    expect(validateIssue(valid)).toEqual({});
  });

  it("flags required fields", () => {
    expect(validateIssue({ ...valid, title: "  ", entryDate: "", severity: "" })).toEqual({
      title: "Title is required.",
      entryDate: "Date is required.",
      severity: "Severity is required.",
    });
  });

  it("flags length limits and future dates (INV-09: at most one day ahead in UTC)", () => {
    const errors = validateIssue({ ...valid, title: "x".repeat(201), description: "y".repeat(4001), entryDate: "2999-01-01", resolutionNotes: "z".repeat(4001) });
    expect(errors.title).toMatch(/200/);
    expect(errors.description).toMatch(/4000/);
    expect(errors.resolutionNotes).toMatch(/4000/);
    expect(errors.entryDate).toBe("Date cannot be in the future.");
    expect(validateIssue({ ...valid, entryDate: maxEntryDate() })).toEqual({});
  });

  it("INV-07: resolution notes are required for RESOLVED and CLOSED only", () => {
    expect(requiresResolutionNotes("RESOLVED")).toBe(true);
    expect(requiresResolutionNotes("CLOSED")).toBe(true);
    expect(requiresResolutionNotes("OPEN")).toBe(false);
    expect(requiresResolutionNotes("IN_PROGRESS")).toBe(false);
    expect(requiresResolutionNotes(undefined)).toBe(false);

    for (const status of ["RESOLVED", "CLOSED"]) {
      expect(validateIssue({ ...valid, status, resolutionNotes: "" }).resolutionNotes).toMatch(/required/);
      expect(validateIssue({ ...valid, status, resolutionNotes: "   " }).resolutionNotes).toMatch(/required/);
      expect(validateIssue({ ...valid, status, resolutionNotes: "Rebooted the router" })).toEqual({});
    }
    for (const status of ["OPEN", "IN_PROGRESS"]) {
      expect(validateIssue({ ...valid, status, resolutionNotes: "" })).toEqual({});
    }
  });

  it("marks the notes field required on edit only when the issue is already resolved/closed", () => {
    const required = (mode: "create" | "edit", current?: IssueStatus) => issueFields(mode, current).find((f) => f.key === "resolutionNotes")?.required;
    expect(required("create")).toBe(false);
    expect(required("edit", "OPEN")).toBe(false);
    expect(required("edit", "RESOLVED")).toBe(true);
    expect(required("edit", "CLOSED")).toBe(true);
  });
});

describe("backend errors → form errors", () => {
  it("maps RESOLUTION_NOTES_REQUIRED (422) onto the resolutionNotes field", () => {
    const err = new ApiError(422, "RESOLUTION_NOTES_REQUIRED", "Resolution notes are required to resolve an issue", [
      { field: "resolutionNotes", code: "REQUIRED", message: "is required when status is RESOLVED or CLOSED" },
    ]);
    expect(toFormErrors(err).fields.resolutionNotes).toBe("is required when status is RESOLVED or CLOSED");
  });

  it("maps INVALID_STATE_TRANSITION (422) onto the status field", () => {
    const err = new ApiError(422, "INVALID_STATE_TRANSITION", "Invalid state transition", [
      { field: "status", code: "INVALID_TRANSITION", message: "cannot move from OPEN to CLOSED" },
    ]);
    expect(toFormErrors(err).fields.status).toBe("cannot move from OPEN to CLOSED");
  });

  it("keeps a form-level message for non-field errors", () => {
    expect(toFormErrors(new ApiError(404, "NOT_FOUND", "Issue not found"))).toEqual({ form: "Issue not found", fields: {} });
  });
});

describe("request mapping", () => {
  it("create omits blank status so the backend applies the OPEN default, and nulls blank text", () => {
    expect(toCreateRequest({ ...valid, status: "", description: "  ", resolutionNotes: " " })).toEqual({
      entryDate: valid.entryDate,
      title: "VPN keeps dropping",
      description: null,
      severity: "HIGH",
      status: undefined,
      resolutionNotes: null,
    });
  });

  it("update sends every field including trimmed resolution notes", () => {
    expect(toUpdateRequest({ ...valid, status: "RESOLVED", severity: "LOW", resolutionNotes: " fixed it " })).toMatchObject({
      status: "RESOLVED",
      severity: "LOW",
      resolutionNotes: "fixed it",
    });
  });

  it("edit form only offers reachable status transitions (no OPEN → CLOSED)", () => {
    const statusOptions = (current: IssueStatus) => {
      const f = issueFields("edit", current).find((x) => x.key === "status");
      return f?.type === "select" ? f.options.map((o) => o.value) : [];
    };
    expect(statusOptions("OPEN")).toEqual(["OPEN", "IN_PROGRESS", "RESOLVED"]);
    expect(statusOptions("IN_PROGRESS")).toEqual(["IN_PROGRESS", "RESOLVED"]);
    expect(statusOptions("RESOLVED")).toEqual(["RESOLVED", "CLOSED", "IN_PROGRESS"]);
    expect(statusOptions("CLOSED")).toEqual(["CLOSED", "IN_PROGRESS"]);
  });
});
