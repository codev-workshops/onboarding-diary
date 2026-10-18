import type { SelectHTMLAttributes } from 'react';

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  /** Label of an empty first option, e.g. "All statuses". Omit to force a choice. */
  emptyLabel?: string;
}

export default function OptionSelect({ options, value, onChange, emptyLabel, ...rest }: Props) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} {...rest}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {Object.entries(options).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
