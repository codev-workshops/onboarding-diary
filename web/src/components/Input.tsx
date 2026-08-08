import { useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldChrome {
  label: string;
  error?: string;
  hint?: string;
}

export type InputProps = FieldChrome & InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ label, error, hint, id, className, ...rest }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={['field__control', error ? 'field__control--error' : '', className ?? '']
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        {...rest}
      />
      {error ? (
        <span className="field__error" id={messageId}>
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={messageId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
};

export type TextareaProps = FieldChrome & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ label, error, hint, id, className, ...rest }: TextareaProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        className={['field__control', error ? 'field__control--error' : '', className ?? '']
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        {...rest}
      />
      {error ? (
        <span className="field__error" id={messageId}>
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={messageId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
};
