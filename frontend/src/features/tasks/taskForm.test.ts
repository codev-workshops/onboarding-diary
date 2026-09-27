import { describe, expect, it } from "vitest";
import { ApiError, type TaskStatus } from "@/lib/apiClient";
import { toFormErrors } from "@/lib/formErrors";
import { maxEntryDate, taskFields, toCreateRequest, todayUtc, toUpdateRequest, validateTask } from "@/features/tasks/taskForm";

const valid = { entryDate: todayUtc(), title: "Read the handbook", description: "", category: "TRAINING", status: "TODO", priority: "MEDIUM" };

describe("validateTask (client-side mirror of the backend rules)", () => {
  it("accepts a valid form", () => {
    expect(validateTask(valid)).toEqual({});
  });

  it("flags required fields", () => {
    expect(validateTask({ ...valid, title: "  ", entryDate: "", category: "" })).toEqual({
      title: "Title is required.",
      entryDate: "Date is required.",
      category: "Category is required.",
    });
  });

  it("flags length limits and future dates (INV-09: at most one day ahead in UTC)", () => {
    const errors = validateTask({ ...valid, title: "x".repeat(201), description: "y".repeat(4001), entryDate: "2999-01-01" });
    expect(errors.title).toMatch(/200/);
    expect(errors.description).toMatch(/4000/);
    expect(errors.entryDate).toBe("Date cannot be in the future.");
    expect(validateTask({ ...valid, entryDate: maxEntryDate() })).toEqual({});
  });
});

describe("backend VALIDATION_FAILED → field errors", () => {
  it("maps each detail onto its field, form-level message only when no field applies", () => {
    const err = new ApiError(400, "VALIDATION_FAILED", "Validation failed", [
      { field: "title", code: "REQUIRED", message: "must not be blank" },
      { field: "entryDate", code: "OUT_OF_RANGE", message: "must not be in the future" },
      { field: "title", code: "TOO_LONG", message: "ignored duplicate" },
    ]);
    const mapped = toFormErrors(err);
    expect(mapped.fields).toEqual({ title: "must not be blank", entryDate: "must not be in the future" });
    expect(mapped.form).toBeUndefined();
  });

  it("maps INVALID_STATE_TRANSITION (422) onto the status field", () => {
    const err = new ApiError(422, "INVALID_STATE_TRANSITION", "Invalid state transition", [
      { field: "status", code: "INVALID_TRANSITION", message: "cannot move from TODO to BLOCKED" },
    ]);
    expect(toFormErrors(err).fields.status).toBe("cannot move from TODO to BLOCKED");
  });

  it("keeps a form-level message for non-field errors", () => {
    expect(toFormErrors(new ApiError(404, "NOT_FOUND", "Task not found"))).toEqual({ form: "Task not found", fields: {} });
    expect(toFormErrors(new Error("offline")).form).toBe("offline");
  });
});

describe("request mapping", () => {
  it("create omits blank status/priority so the backend applies TODO/MEDIUM defaults", () => {
    expect(toCreateRequest({ ...valid, status: "", priority: "", description: "  " })).toEqual({
      entryDate: valid.entryDate,
      title: "Read the handbook",
      description: null,
      category: "TRAINING",
      status: undefined,
      priority: undefined,
    });
  });

  it("update sends every field", () => {
    expect(toUpdateRequest({ ...valid, status: "DONE", priority: "HIGH", description: " notes " })).toMatchObject({
      status: "DONE",
      priority: "HIGH",
      description: "notes",
    });
  });

  it("edit form only offers reachable status transitions", () => {
    const statusOptions = (current: TaskStatus) => {
      const f = taskFields("edit", current).find((x) => x.key === "status");
      return f?.type === "select" ? f.options.map((o) => o.value) : [];
    };
    expect(statusOptions("TODO")).toEqual(["TODO", "IN_PROGRESS", "DONE"]);
    expect(statusOptions("BLOCKED")).toEqual(["BLOCKED", "IN_PROGRESS", "TODO"]);
  });
});
