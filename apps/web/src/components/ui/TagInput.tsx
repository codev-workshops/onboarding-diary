import { useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { TAGS_MAX_COUNT, TAG_MAX_LENGTH } from '@onboarding-diary/shared';

import { cx, FIELD_CLASS } from './styles.js';

export type TagInputProps = {
  value: readonly string[];
  onChange: (tags: string[]) => void;
  id?: string;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
};

/** Mirrors the server-side normalisation so the field shows what will be stored. */
export function normaliseTag(raw: string): string {
  return raw.trim().toLowerCase().slice(0, TAG_MAX_LENGTH);
}

export function TagInput({ value, onChange, id, ...aria }: TagInputProps): ReactNode {
  const [draft, setDraft] = useState('');

  function commit(raw: string): void {
    const tag = normaliseTag(raw);
    setDraft('');
    if (tag.length === 0 || value.includes(tag) || value.length >= TAGS_MAX_COUNT) return;
    onChange([...value, tag]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2" aria-label="Selected tags">
        {value.map((tag) => (
          <li key={tag}>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-900">
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                className="rounded-full px-1 text-sky-800 hover:bg-sky-200"
                onClick={() => onChange(value.filter((item) => item !== tag))}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      <input
        id={id}
        className={cx(FIELD_CLASS)}
        value={draft}
        placeholder={
          value.length >= TAGS_MAX_COUNT ? 'Tag limit reached' : 'Add a tag and press Enter'
        }
        disabled={value.length >= TAGS_MAX_COUNT}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        {...aria}
      />
    </div>
  );
}
