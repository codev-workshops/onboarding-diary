import { z } from 'zod';
import { USER } from '../constants';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(USER.EMAIL_MAX_LENGTH),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(USER.EMAIL_MAX_LENGTH),
  password: z
    .string()
    .min(
      USER.PASSWORD_MIN_LENGTH,
      `Password must be at least ${USER.PASSWORD_MIN_LENGTH} characters`,
    )
    .max(USER.PASSWORD_MAX_LENGTH)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  first_name: z
    .string()
    .min(USER.NAME_MIN_LENGTH)
    .max(USER.NAME_MAX_LENGTH)
    .regex(/^[a-zA-Z\s-]+$/, 'Name can only contain letters, spaces, and hyphens'),
  last_name: z
    .string()
    .min(USER.NAME_MIN_LENGTH)
    .max(USER.NAME_MAX_LENGTH)
    .regex(/^[a-zA-Z\s-]+$/, 'Name can only contain letters, spaces, and hyphens'),
  department: z.string().max(USER.DEPARTMENT_MAX_LENGTH).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(
      USER.PASSWORD_MIN_LENGTH,
      `Password must be at least ${USER.PASSWORD_MIN_LENGTH} characters`,
    )
    .max(USER.PASSWORD_MAX_LENGTH)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
