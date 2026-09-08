import { cloneElement, isValidElement } from 'react';
import type { ReactNode } from 'react';

export function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const control =
    error && isValidElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(children)
      ? cloneElement(children, { 'aria-describedby': errorId, 'aria-invalid': true })
      : children;

  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {control}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none';

export const buttonClass =
  'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50';
