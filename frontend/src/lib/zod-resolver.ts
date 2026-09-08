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

    const errors: Record<string, FieldError> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors[path] ??= { type: issue.code, message: issue.message };
    }

    return { values: {}, errors: errors as FieldErrors<T> };
  };
}
