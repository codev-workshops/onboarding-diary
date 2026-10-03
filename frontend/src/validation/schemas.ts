import { z } from 'zod';

export const PASSWORD_RULE_MESSAGE =
  'Use 8-72 characters with an upper-case letter, a lower-case letter and a digit';

export const passwordSchema = z
  .string()
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, PASSWORD_RULE_MESSAGE);

const emailSchema = z.string().trim().min(1, 'Email is required').email('Enter a valid email');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const profileFields = {
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  jobTitle: z.string().trim().max(120).optional(),
  department: z.string().trim().min(1, 'Department is required').max(120),
  startDate: z.string().min(1, 'Start date is required'),
};

export const profileSchema = z.object(profileFields);

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    ...profileFields,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Scores password strength 0-4 for the signup strength meter. */
export function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
  return score;
}
