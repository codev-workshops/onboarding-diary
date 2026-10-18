import type { ReactNode } from 'react';

interface Props {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/** Label + control + inline validation message. */
export default function Field({ label, htmlFor, error, hint, required, children }: Props) {
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && (
        <small className="error" role="alert" id={`${htmlFor}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
