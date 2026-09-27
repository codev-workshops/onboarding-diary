import type { EntryFieldDef, FormValues } from "@/components/entries/EntryForm";
import type { Feedback, FeedbackCreateRequest, FeedbackType, FeedbackUpdateRequest } from "@/lib/apiClient";
import { FEEDBACK_TYPE_OPTIONS } from "@/features/feedback/labels";
import { maxEntryDate, todayUtc } from "@/features/tasks/taskForm";

export const SUBJECT_MAX = 200;
export const DETAILS_MAX = 4000;

export function feedbackToFormValues(note: Feedback | null): FormValues {
  return {
    entryDate: note?.entryDate ?? todayUtc(),
    subject: note?.subject ?? "",
    type: note?.type ?? "",
    details: note?.details ?? "",
  };
}

export function feedbackFields(): EntryFieldDef[] {
  return [
    { key: "subject", label: "Subject", type: "text", maxLength: SUBJECT_MAX, required: true },
    { key: "entryDate", label: "Date", type: "date", max: maxEntryDate(), required: true, row: "meta" },
    { key: "type", label: "Type", type: "select", options: FEEDBACK_TYPE_OPTIONS, placeholder: "Select a type", required: true, row: "meta" },
    {
      key: "details",
      label: "Details",
      type: "textarea",
      maxLength: DETAILS_MAX,
      rows: 6,
      required: true,
      hint: `Required, up to ${DETAILS_MAX} characters. Only you, your current manager and administrators can read this.`,
    },
  ];
}

/** Client-side mirror of the backend field rules (REQ-FUNC-050). */
export function validateFeedback(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const subject = (values.subject ?? "").trim();
  if (!subject) errors.subject = "Subject is required.";
  else if (subject.length > SUBJECT_MAX) errors.subject = `Subject must be at most ${SUBJECT_MAX} characters.`;
  const details = (values.details ?? "").trim();
  if (!details) errors.details = "Details are required.";
  else if (details.length > DETAILS_MAX) errors.details = `Details must be at most ${DETAILS_MAX} characters.`;
  if (!values.entryDate) errors.entryDate = "Date is required.";
  else if (values.entryDate > maxEntryDate()) errors.entryDate = "Date cannot be in the future.";
  if (!values.type) errors.type = "Type is required.";
  return errors;
}

export function toCreateRequest(values: FormValues): FeedbackCreateRequest {
  return {
    entryDate: values.entryDate,
    subject: values.subject.trim(),
    type: values.type as FeedbackType,
    details: values.details.trim(),
  };
}

export function toUpdateRequest(values: FormValues): FeedbackUpdateRequest {
  return toCreateRequest(values);
}
