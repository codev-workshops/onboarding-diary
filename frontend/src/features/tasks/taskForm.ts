import type { EntryFieldDef, FormValues } from "@/components/entries/EntryForm";
import type { Task, TaskCategory, TaskCreateRequest, TaskPriority, TaskStatus, TaskUpdateRequest } from "@/lib/apiClient";
import { TASK_TRANSITIONS } from "@/lib/apiClient";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS, TASK_STATUS_LABELS } from "@/features/tasks/labels";

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 4000;

/** Today's date in UTC as `YYYY-MM-DD` (INV-09 is evaluated in UTC by the backend). */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Latest date the backend accepts: one day after the UTC date (timezone slack). */
export function maxEntryDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function taskToFormValues(task: Task | null): FormValues {
  return {
    entryDate: task?.entryDate ?? todayUtc(),
    title: task?.title ?? "",
    description: task?.description ?? "",
    category: task?.category ?? "",
    status: task?.status ?? "TODO",
    priority: task?.priority ?? "MEDIUM",
  };
}

/**
 * Field definitions for create and edit. On edit the status select only offers
 * the current status plus its allowed transitions, mirroring the backend
 * `StateMachine<TaskStatus>` so users cannot pick a 422 by accident.
 */
export function taskFields(mode: "create" | "edit", current?: TaskStatus): EntryFieldDef[] {
  const statusOptions =
    mode === "edit" && current
      ? [current, ...TASK_TRANSITIONS[current]].map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))
      : STATUS_OPTIONS;
  return [
    { key: "title", label: "Title", type: "text", maxLength: TITLE_MAX, required: true },
    { key: "entryDate", label: "Date", type: "date", max: maxEntryDate(), required: true, row: "meta" },
    { key: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS, placeholder: "Select a category", required: true, row: "meta" },
    { key: "status", label: "Status", type: "select", options: statusOptions, row: "state" },
    { key: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, row: "state" },
    { key: "description", label: "Description", type: "textarea", maxLength: DESCRIPTION_MAX, rows: 6, hint: `Optional, up to ${DESCRIPTION_MAX} characters.` },
  ];
}

/** Client-side mirror of the backend field rules; messages match the backend detail codes' intent. */
export function validateTask(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = (values.title ?? "").trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters.`;
  if ((values.description ?? "").length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters.`;
  }
  if (!values.entryDate) errors.entryDate = "Date is required.";
  else if (values.entryDate > maxEntryDate()) errors.entryDate = "Date cannot be in the future.";
  if (!values.category) errors.category = "Category is required.";
  return errors;
}

export function toCreateRequest(values: FormValues): TaskCreateRequest {
  return {
    entryDate: values.entryDate,
    title: values.title.trim(),
    description: values.description?.trim() || null,
    category: values.category as TaskCategory,
    status: (values.status || undefined) as TaskStatus | undefined,
    priority: (values.priority || undefined) as TaskPriority | undefined,
  };
}

export function toUpdateRequest(values: FormValues): TaskUpdateRequest {
  return {
    entryDate: values.entryDate,
    title: values.title.trim(),
    description: values.description?.trim() || null,
    category: values.category as TaskCategory,
    status: values.status as TaskStatus,
    priority: values.priority as TaskPriority,
  };
}
