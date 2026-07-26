import type { ReactNode, SelectHTMLAttributes } from 'react';

import { cx, FIELD_CLASS } from './styles.js';

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  options: readonly SelectOption[];
  placeholder?: string;
};

export function Select({ options, placeholder, className, ...rest }: SelectProps): ReactNode {
  return (
    <select className={cx(FIELD_CLASS, className)} {...rest}>
      {placeholder === undefined ? null : <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
