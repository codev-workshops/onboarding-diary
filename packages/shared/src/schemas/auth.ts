import { z } from 'zod';

import { FULL_NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants.js';
import { trimmedNonEmptyString } from '../primitives.js';

export const email = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().email('Must be a valid email address').max(254));

export const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Must be at most ${PASSWORD_MAX_LENGTH} characters`);

export const signupBody = z.object({
  fullName: trimmedNonEmptyString(FULL_NAME_MAX_LENGTH),
  email,
  password,
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export type SignupBody = z.infer<typeof signupBody>;
export type LoginBody = z.infer<typeof loginBody>;

export type AuthTokensDto = {
  accessToken: string;
  accessTokenExpiresAt: string;
};
