import type { EntryFieldDef, FormValues } from "@/components/entries/EntryForm";
import type { Issue, IssueCreateRequest, IssueSeverity, IssueStatus, IssueUpdateRequest } from "@/lib/apiClient";
import { ISSUE_STATUSES_REQUIRING_NOTES, ISSUE_TRANSITIONS } from "@/lib/apiClient";
import { ISSUE_SEVERITY_OPTIONS, ISSUE_STATUS_LABELS, ISSUE_STATUS_OPTIONS } from "@/features/issues/labels";

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 4000;
export const RESOLUTION_NOTES_MAX = 4000;

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

/** INV-07: RESOLVED / CLOSED need non-blank resolution notes. */
export function requiresResolutionNotes(status: string | undefined): boolean {
  return (ISSUE_STATUSES_REQUIRING_NOTES as readonly string[]).includes(status ?? "");
}

export function issueToFormValues(issue: Issue | null): FormValues {
  return {
    entryDate: issue?.entryDate ?? todayUtc(),
    title: issue?.title ?? "",
    description: issue?.description ?? "",
    severity: issue?.severity ?? "",
    status: issue?.status ?? "OPEN",
    resolutionNotes: issue?.resolutionNotes ?? "",
  };
}

/**
 * Field definitions for create and edit. On edit the status select only offers
 * the current status plus its allowed transitions, mirroring the backend
 * `StateMachine<IssueStatus>` so users cannot pick a 422 by accident. The
 * resolution-notes field is marked required when the issue is already
 * resolved/closed; `validateIssue` enforces INV-07 for whatever status is
 * picked on submit.
 */
export function issueFields(mode: "create" | "edit", current?: IssueStatus): EntryFieldDef[] {
  const statusOptions =
    mode === "edit" && current
      ? [current, ...ISSUE_TRANSITIONS[current]].map((s) => ({ value: s, label: ISSUE_STATUS_LABELS[s] }))
      : ISSUE_STATUS_OPTIONS;
  const notesRequired = mode === "edit" && requiresResolutionNotes(current);
  return [
    { key: "title", label: "Title", type: "text", maxLength: TITLE_MAX, required: true },
    { key: "entryDate", label: "Date", type: "date", max: maxEntryDate(), required: true, row: "meta" },
    { key: "severity", label: "Severity", type: "select", options: ISSUE_SEVERITY_OPTIONS, placeholder: "Select a severity", required: true, row: "meta" },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    { key: "description", label: "Description", type: "textarea", maxLength: DESCRIPTION_MAX, rows: 5, hint: `Optional, up to ${DESCRIPTION_MAX} characters.` },
    {
      key: "resolutionNotes",
      label: "Resolution notes",
      type: "textarea",
      maxLength: RESOLUTION_NOTES_MAX,
      rows: 4,
      required: notesRequired,
      hint: `Required when the status is Resolved or Closed, up to ${RESOLUTION_NOTES_MAX} characters.`,
    },
  ];
}

/** Client-side mirror of the backend field rules, including INV-07. */
export function validateIssue(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = (values.title ?? "").trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters.`;
  if ((values.description ?? "").length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters.`;
  }
  if (!values.entryDate) errors.entryDate = "Date is required.";
  else if (values.entryDate > maxEntryDate()) errors.entryDate = "Date cannot be in the future.";
  if (!values.severity) errors.severity = "Severity is required.";
  const notes = values.resolutionNotes ?? "";
  if (requiresResolutionNotes(values.status) && !notes.trim()) {
    errors.resolutionNotes = "Resolution notes are required when the issue is resolved or closed.";
  } else if (notes.length > RESOLUTION_NOTES_MAX) {
    errors.resolutionNotes = `Resolution notes must be at most ${RESOLUTION_NOTES_MAX} characters.`;
  }
  return errors;
}

export function toCreateRequest(values: FormValues): IssueCreateRequest {
  return {
    entryDate: values.entryDate,
    title: values.title.trim(),
    description: values.description?.trim() || null,
    severity: values.severity as IssueSeverity,
    status: (values.status || undefined) as IssueStatus | undefined,
    resolutionNotes: values.resolutionNotes?.trim() || null,
  };
}

export function toUpdateRequest(values: FormValues): IssueUpdateRequest {
  return {
    entryDate: values.entryDate,
    title: values.title.trim(),
    description: values.description?.trim() || null,
    severity: values.severity as IssueSeverity,
    status: values.status as IssueStatus,
    resolutionNotes: values.resolutionNotes?.trim() || null,
  };
}
