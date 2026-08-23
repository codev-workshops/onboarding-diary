import { z } from 'zod';

import { passwordSchema } from '@/src/shared/schemas/auth';

/**
 * The fields a user may change about themselves (§12.4). Role, manager, active
 * state and email are absent on purpose: AZ-R5 requires the *whole* request to
 * be refused with `403 FORBIDDEN_FIELD` when one is named, which is a different
 * answer from "unknown field", so the route screens for them before parsing.
 */
export const FORBIDDEN_SELF_FIELDS = ['role', 'manager_id', 'is_active', 'email'] as const;

export const updateSelfSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(120, 'Name must be at most 120 characters.'),
    department_id: z.string().uuid('Choose a department from the list.').nullable(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.'),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update.');

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    new_password: passwordSchema,
  })
  .strict();

export type UpdateSelfInput = z.infer<typeof updateSelfSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
