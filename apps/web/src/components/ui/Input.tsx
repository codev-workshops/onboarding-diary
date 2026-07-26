import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

import { cx, FIELD_CLASS } from './styles.js';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps): ReactNode {
  return <input className={cx(FIELD_CLASS, className)} {...rest} />;
}

export function DateInput({ className, ...rest }: InputProps): ReactNode {
  return <input type="date" className={cx(FIELD_CLASS, className)} {...rest} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 4, ...rest }: TextareaProps): ReactNode {
  return <textarea rows={rows} className={cx(FIELD_CLASS, className)} {...rest} />;
}
