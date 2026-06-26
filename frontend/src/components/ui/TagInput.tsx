'use client';

import React, { useState, useCallback } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  label?: string;
  error?: string;
}

const TAG_PATTERN = /^[a-zA-Z0-9-]+$/;

export default function TagInput({
  tags,
  onChange,
  maxTags = 10,
  label,
  error,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = useCallback(
    (value: string) => {
      const tag = value.trim().toLowerCase();
      if (!tag) return;
      if (tag.length > 50) return;
      if (!TAG_PATTERN.test(tag)) return;
      if (tags.includes(tag)) return;
      if (tags.length >= maxTags) return;
      onChange([...tags, tag]);
      setInputValue('');
    },
    [tags, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? 'Type a tag and press Enter' : 'Add tag...'}
            className="flex-1 min-w-[120px] border-none outline-none text-sm placeholder-gray-400 bg-transparent p-0"
          />
        )}
      </div>
      <div className="mt-1 flex justify-between">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-xs text-gray-500">
            Alphanumeric and hyphens only. Press Enter to add.
          </p>
        )}
        <span className="text-xs text-gray-400">
          {tags.length}/{maxTags}
        </span>
      </div>
    </div>
  );
}
