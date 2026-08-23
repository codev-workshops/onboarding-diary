import { UserRole } from '@prisma/client';
import { z } from 'zod';

import { emailSchema } from '@/src/shared/schemas/auth';

const fullName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(120, 'Name must be at most 120 characters.');

const startDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Enter a real date.');

/**
 * `.strict()` throughout, for the same reason the entry schemas use it: an
 * unexpected key on an admin write is an escalation attempt worth a 422, not a
 * field to ignore. `password_hash`, `id` and `version` are simply unspeakable.
 */
export const createUserSchema = z
  .object({
    email: emailSchema,
    full_name: fullName,
    role: z.nativeEnum(UserRole).default('RECRUIT'),
    department_id: z.string().uuid('Choose a department from the list.').nullish(),
    start_date: startDate,
    manager_id: z.string().uuid('Choose a manager from the list.').nullish(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    email: emailSchema,
    full_name: fullName,
    role: z.nativeEnum(UserRole),
    department_id: z.string().uuid('Choose a department from the list.').nullable(),
    start_date: startDate,
    manager_id: z.string().uuid('Choose a manager from the list.').nullable(),
    is_active: z.boolean(),
    // FR-AD6: the only way to demote a manager who still has direct reports.
    reassign_to: z.string().uuid('Choose a manager from the list.').nullable(),
  })
  .partial()
  .strict()
  .refine(
    (body) => Object.keys(body).some((key) => key !== 'reassign_to'),
    'Provide at least one field to update.'
  );

export const deactivateUserSchema = z
  .object({ reason: z.string().trim().max(255).optional() })
  .strict()
  .default({});

export const adminUserListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    role: z.nativeEnum(UserRole).optional(),
    department_id: z.string().uuid().optional(),
    manager_id: z.string().uuid().optional(),
    is_active: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
