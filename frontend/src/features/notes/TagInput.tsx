"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { MAX_TAGS_PER_NOTE } from "@/lib/apiClient";
import { normalizeTag } from "@/stores/NoteStore";
import { tagError } from "@/features/notes/noteForm";
import formStyles from "@/components/ui/forms.module.css";
import styles from "./notes.module.css";

interface TagInputProps {
  id: string;
  label: string;
  value: readonly string[];
  onChange: (tags: string[]) => void;
  /** Field-level error from the form / backend (e.g. `tags must not exceed 10`). */
  error?: string;
  hint?: string;
  disabled?: boolean;
  max?: number;
}

/**
 * Chips editor for note tags (REQ-FUNC-061). Typing a tag and pressing Enter,
 * comma or Tab adds it (normalized to trimmed lowercase, duplicates ignored);
 * Backspace on an empty draft removes the last chip. Invalid drafts are rejected
 * with an inline message — the same rule the backend applies (§7.7).
 */
export function TagInput({ id, label, value, onChange, error, hint, disabled, max = MAX_TAGS_PER_NOTE }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shownError = draftError ?? error;
  const full = value.length >= max;

  const commit = (): boolean => {
    const raw = draft;
    if (!raw.trim()) return true;
    const problem = tagError(raw);
    if (problem) {
      setDraftError(problem);
      return false;
    }
    const tag = normalizeTag(raw);
    if (value.includes(tag)) {
      setDraft("");
      setDraftError(null);
      return true;
    }
    if (full) {
      setDraftError(`At most ${max} tags per note.`);
      return false;
    }
    onChange([...value, tag]);
    setDraft("");
    setDraftError(null);
    return true;
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
    setDraftError(null);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Tab" && draft.trim()) {
      if (!commit()) e.preventDefault();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      e.preventDefault();
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className={formStyles.field}>
      <label htmlFor={id} className={formStyles.label}>
        {label}
      </label>
      <div
        className={`${styles.tagInput} ${shownError ? styles.tagInputInvalid : ""}`}
        onClick={() => inputRef.current?.focus()}
        data-testid={`${id}-chips`}
      >
        {value.map((tag) => (
          <span key={tag} className={styles.chip} data-testid="tag-chip">
            {tag}
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={`Remove tag ${tag}`}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                remove(tag);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          className={styles.chipField}
          value={draft}
          placeholder={value.length === 0 ? "Add a tag and press Enter" : full ? "" : "Add another…"}
          disabled={disabled}
          autoComplete="off"
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            if (draftError) setDraftError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => commit()}
        />
      </div>
      {hint && !shownError && (
        <span id={`${id}-hint`} className={formStyles.hint}>
          {hint}
        </span>
      )}
      {shownError && (
        <span id={`${id}-error`} className={formStyles.fieldError} role="alert">
          {shownError}
        </span>
      )}
    </div>
  );
}
