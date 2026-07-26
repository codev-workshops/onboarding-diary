import { z } from 'zod';

import { DEPARTMENT_MAX_LENGTH, FULL_NAME_MAX_LENGTH } from '../constants.js';
import { ROLES, type Role } from '../enums.js';
import { calendarDate, paginationQuery, trimmedNonEmptyString, uuid } from '../primitives.js';

export const updateOwnProfileBody = z.object({
  fullName: trimmedNonEmptyString(FULL_NAME_MAX_LENGTH).optional(),
  department: z
    .string()
    .max(DEPARTMENT_MAX_LENGTH)
    .transform((value) => value.trim())
    .nullish()
    .transform((value) => (value === undefined || value === '' ? null : value))
    .optional(),
  startDate: calendarDate.nullish().optional(),
});

export const updateUserBody = z.object({
  role: z.enum(ROLES).optional(),
  managerId: uuid.nullish().optional(),
  isActive: z.boolean().optional(),
});

export const listUsersQuery = paginationQuery.extend({
  q: z.string().trim().min(1).max(120).optional(),
  role: z.enum(ROLES).optional(),
  department: z.string().trim().min(1).max(DEPARTMENT_MAX_LENGTH).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type UpdateOwnProfileBody = z.infer<typeof updateOwnProfileBody>;
export type UpdateUserBody = z.infer<typeof updateUserBody>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;

export type UserDto = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  department: string | null;
  startDate: string | null;
  managerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
