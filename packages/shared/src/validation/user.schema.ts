import { z } from 'zod';
import { PAGINATION, USER } from '../constants';
import { Role, UserStatus } from '../enums';

export const updateProfileSchema = z.object({
  first_name: z
    .string()
    .min(USER.NAME_MIN_LENGTH)
    .max(USER.NAME_MAX_LENGTH)
    .regex(/^[a-zA-Z\s-]+$/, 'Name can only contain letters, spaces, and hyphens')
    .optional(),
  last_name: z
    .string()
    .min(USER.NAME_MIN_LENGTH)
    .max(USER.NAME_MAX_LENGTH)
    .regex(/^[a-zA-Z\s-]+$/, 'Name can only contain letters, spaces, and hyphens')
    .optional(),
  avatar_url: z.string().url().max(500).optional().nullable(),
});

export const updateRecruitProfileSchema = z.object({
  department: z.string().max(USER.DEPARTMENT_MAX_LENGTH).optional().nullable(),
  position: z.string().max(USER.POSITION_MAX_LENGTH).optional().nullable(),
  start_date: z.string().date('Must be a valid date (YYYY-MM-DD)').optional().nullable(),
  expected_end_date: z.string().date('Must be a valid date (YYYY-MM-DD)').optional().nullable(),
  bio: z.string().max(USER.BIO_MAX_LENGTH).optional().nullable(),
  onboarding_status: z.string().max(50).optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(USER.PASSWORD_MIN_LENGTH)
    .max(USER.PASSWORD_MAX_LENGTH)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export const assignManagerSchema = z.object({
  manager_id: z.string().uuid('Must be a valid UUID'),
  recruit_id: z.string().uuid('Must be a valid UUID'),
  notes: z.string().max(1000).optional(),
});

export const unassignManagerSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sort_by: z.enum(['created_at', 'first_name', 'last_name', 'email', 'role', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().max(100).optional(),
});

export const assignmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  manager_id: z.string().uuid().optional(),
  recruit_id: z.string().uuid().optional(),
  is_active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
export type UpdateRecruitProfileSchema = z.infer<typeof updateRecruitProfileSchema>;
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
export type UpdateRoleSchema = z.infer<typeof updateRoleSchema>;
export type UpdateStatusSchema = z.infer<typeof updateStatusSchema>;
export type AssignManagerSchema = z.infer<typeof assignManagerSchema>;
export type UnassignManagerSchema = z.infer<typeof unassignManagerSchema>;
export type UserListQuerySchema = z.infer<typeof userListQuerySchema>;
export type AssignmentListQuerySchema = z.infer<typeof assignmentListQuerySchema>;
