import { z } from 'zod';
import { USER } from '../constants';
import { Role, UserStatus } from '../enums';

export const updateProfileSchema = z.object({
  first_name: z
    .string()
    .min(USER.NAME_MIN_LENGTH)
    .max(USER.NAME_MAX_LENGTH)
    .regex(/^[a-zA-Z\s-]+$/)
    .optional(),
  last_name: z
    .string()
    .min(USER.NAME_MIN_LENGTH)
    .max(USER.NAME_MAX_LENGTH)
    .regex(/^[a-zA-Z\s-]+$/)
    .optional(),
  bio: z.string().max(USER.BIO_MAX_LENGTH).optional(),
  department: z.string().max(USER.DEPARTMENT_MAX_LENGTH).optional(),
  avatar_url: z.string().url().optional(),
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

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
export type UpdateRoleSchema = z.infer<typeof updateRoleSchema>;
export type UpdateStatusSchema = z.infer<typeof updateStatusSchema>;
