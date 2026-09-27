"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "@/components/ui/FormField";
import type { FormErrors } from "@/lib/apiClient";
import { MAX_TAGS_PER_NOTE } from "@/lib/apiClient";
import { EMPTY_ERRORS, toFormErrors } from "@/lib/formErrors";
import { TagInput } from "@/features/notes/TagInput";
import { CONTENT_MAX, TITLE_MAX, maxEntryDate, validateNote, type NoteFormValues } from "@/features/notes/noteForm";
import entryStyles from "@/components/entries/entries.module.css";
import formStyles from "@/components/ui/forms.module.css";

interface NoteFormProps {
  initialValues: NoteFormValues;
  /** Performs the API call; thrown `ApiError`s are mapped onto the fields via `toFormErrors`. */
  onSubmit: (values: NoteFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  busy?: boolean;
  idPrefix?: string;
}

/**
 * Note create/edit form. Mirrors `EntryForm`'s draft/error handling but renders
 * the `TagInput` chips editor, which the generic field list does not support.
 */
export function NoteForm({ initialValues, onSubmit, onCancel, submitLabel, busy, idPrefix = "note" }: NoteFormProps) {
  const [values, setValues] = useState<NoteFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  const set = <K extends keyof NoteFormValues>(key: K, value: NoteFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors.fields[key]) {
      setErrors((e) => {
        const next = { ...e.fields };
        delete next[key];
        return { ...e, fields: next };
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clientErrors = validateNote(values);
    if (tagDraft.trim()) {
      clientErrors.tags = `Press Enter to add “${tagDraft.trim()}” as a tag, or clear it before saving.`;
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors({ fields: clientErrors });
      return;
    }
    setErrors(EMPTY_ERRORS);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setErrors(toFormErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = busy || submitting;
  const id = (key: string) => `${idPrefix}-${key}`;
  const contentError = errors.fields.content;
  // Backend reports tag problems either on `tags` or on the offending element (`tags[2]`).
  const tagsError = errors.fields.tags ?? Object.entries(errors.fields).find(([k]) => k.startsWith("tags["))?.[1];

  return (
    <form className={formStyles.form} onSubmit={(e) => void handleSubmit(e)} noValidate data-testid={`${idPrefix}-form`}>
      {errors.form && (
        <div className={formStyles.formError} role="alert" data-testid={`${idPrefix}-form-error`}>
          {errors.form}
        </div>
      )}
      <FormField
        id={id("title")}
        label="Title"
        value={values.title}
        maxLength={TITLE_MAX}
        required
        disabled={disabled}
        error={errors.fields.title}
        onChange={(e) => set("title", e.target.value)}
      />
      <FormField
        id={id("entryDate")}
        type="date"
        label="Date"
        value={values.entryDate}
        max={maxEntryDate()}
        required
        disabled={disabled}
        error={errors.fields.entryDate}
        onChange={(e) => set("entryDate", e.target.value)}
      />
      <TagInput
        id={id("tags")}
        label="Tags"
        value={values.tags}
        onChange={(tags) => set("tags", tags)}
        onDraftChange={(draft) => {
          setTagDraft(draft);
          if (errors.fields.tags) set("tags", values.tags); // clears the pending-draft error
        }}
        error={tagsError}
        hint={`Up to ${MAX_TAGS_PER_NOTE} tags: lowercase letters, digits and hyphens. Press Enter or comma to add.`}
        disabled={disabled}
      />
      <div className={formStyles.field}>
        <label htmlFor={id("content")} className={formStyles.label}>
          Content
        </label>
        <textarea
          id={id("content")}
          className={`${entryStyles.textarea} ${contentError ? entryStyles.inputInvalid : ""}`}
          value={values.content}
          rows={8}
          maxLength={CONTENT_MAX}
          required
          disabled={disabled}
          aria-invalid={contentError ? true : undefined}
          aria-describedby={contentError ? `${id("content")}-error` : `${id("content")}-hint`}
          onChange={(e) => set("content", e.target.value)}
        />
        {!contentError && (
          <span id={`${id("content")}-hint`} className={formStyles.hint}>
            Up to {CONTENT_MAX.toLocaleString()} characters.
          </span>
        )}
        {contentError && (
          <span id={`${id("content")}-error`} className={formStyles.fieldError} role="alert">
            {contentError}
          </span>
        )}
      </div>
      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.button} disabled={disabled} data-testid={`${idPrefix}-submit`}>
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={`${formStyles.button} ${formStyles.buttonSecondary}`} onClick={onCancel} disabled={disabled}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
