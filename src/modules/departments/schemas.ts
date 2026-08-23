import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name must be at most 80 characters.');

const description = z.string().trim().max(255).nullable();

export const createDepartmentSchema = z.object({ name, description: description.optional() }).strict();

export const updateDepartmentSchema = z
  .object({ name, description, is_active: z.boolean() })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update.');

export const departmentQuerySchema = z
  .object({
    include_inactive: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
  })
  .strict();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
