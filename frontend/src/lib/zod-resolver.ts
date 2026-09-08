import type { FieldError, FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Minimal bridge between Zod and React Hook Form, so neither an extra resolver package nor a
 * hand-written validation pass is needed.
 */
export function zodResolver<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  return (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: Record<string, unknown> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String);
      // React Hook Form keeps an error about a field array itself under `root`.
      if (Array.isArray(valueAt(values, path))) {
        path.push('root');
      }
      setError(errors, path, { type: issue.code, message: issue.message });
    }

    return { values: {}, errors: errors as FieldErrors<T> };
  };
}

const valueAt = (values: unknown, path: string[]): unknown =>
  path.reduce<unknown>(
    (current, key) =>
      typeof current === 'object' && current !== null
        ? (current as Record<string, unknown>)[key]
        : undefined,
    values
  );

const isLeaf = (value: unknown): value is FieldError =>
  typeof value === 'object' && value !== null && typeof (value as FieldError).message === 'string';

/**
 * React Hook Form reads errors by path (`items.0.title`), so a Zod issue path becomes nested
 * objects. An error on a group itself (for example "at least one item") lands on its `root`.
 */
function setError(target: Record<string, unknown>, path: string[], error: FieldError): void {
  const [key, ...rest] = path;

  if (rest.length === 0) {
    const existing = target[key];
    if (isLeaf(existing)) {
      return;
    }
    if (typeof existing === 'object' && existing !== null) {
      (existing as Record<string, unknown>).root ??= error;
      return;
    }
    target[key] = error;
    return;
  }

  const existing = target[key];
  const branch: Record<string, unknown> = isLeaf(existing)
    ? { root: existing }
    : ((existing as Record<string, unknown>) ?? {});
  target[key] = branch;
  setError(branch, rest, error);
}
