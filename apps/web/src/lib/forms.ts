/**
 * Form wiring (T-116). `useZodForm` binds a shared schema to React Hook Form, and
 * `applyServerErrors` maps a 422 envelope's `details` onto the matching fields, falling
 * back to the form-level error when the server names a field the form does not have
 * (FR-X6).
 */

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useForm } from 'react-hook-form';
import type {
  FieldValues,
  Path,
  UseFormProps,
  UseFormReturn,
  UseFormSetError,
} from 'react-hook-form';
import type { z } from 'zod';

import { ApiError } from './apiClient.js';

export function useZodForm<TInput extends FieldValues, TOutput>(
  schema: z.ZodType<TOutput, TInput>,
  options: Omit<UseFormProps<TInput, unknown, TOutput>, 'resolver'> = {},
): UseFormReturn<TInput, unknown, TOutput> {
  return useForm<TInput, unknown, TOutput>(
    Object.assign({ mode: 'onSubmit' as const }, options, {
      resolver: standardSchemaResolver<TInput, unknown, TOutput>(schema),
    }),
  );
}

export function applyServerErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  knownFields: readonly Path<TFieldValues>[],
): boolean {
  if (!(error instanceof ApiError)) return false;

  const unmatched: string[] = [];
  for (const detail of error.details) {
    const field = knownFields.find((name) => name === detail.field);
    if (field === undefined) {
      unmatched.push(detail.message);
      continue;
    }
    setError(field, { type: 'server', message: detail.message });
  }

  if (error.details.length === 0 || unmatched.length > 0) {
    setError('root' as Path<TFieldValues>, {
      type: 'server',
      message: unmatched.length > 0 ? unmatched.join(' ') : error.message,
    });
  }
  return true;
}
