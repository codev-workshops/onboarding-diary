import type { SelectOption } from '../../components/ui/Select.js';

/** Turns an enum plus its label map into `<Select>` options, preserving the enum's order. */
export function enumOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): SelectOption[] {
  return values.map((value) => ({ value, label: labels[value] }));
}
