import { describe, expect, it } from 'vitest';

import { loginSchema, signupSchema } from '@/src/shared/schemas/auth';

const validSignup = {
  email: 'Ada@Onboarding.TEST',
  password: 'Onboard1ngDiary',
  full_name: '  Ada Lovelace  ',
  start_date: '2026-03-02',
};

describe('signupSchema', () => {
  it('normalises the email and trims the name', () => {
    const parsed = signupSchema.parse(validSignup);

    expect(parsed.email).toBe('ada@onboarding.test');
    expect(parsed.full_name).toBe('Ada Lovelace');
    expect(parsed.department_id).toBeUndefined();
  });

  it.each([
    ['short password', { password: 'Onbo1rdi' }],
    ['no uppercase', { password: 'onboard1ngdiary' }],
    ['no lowercase', { password: 'ONBOARD1NGDIARY' }],
    ['no digit', { password: 'OnboardingDiary' }],
    ['malformed email', { email: 'not-an-email' }],
    ['one-character name', { full_name: 'A' }],
    ['non-ISO start date', { start_date: '02/03/2026' }],
    ['impossible start date', { start_date: '2026-02-31' }],
    ['non-uuid department', { department_id: 'engineering' }],
  ])('rejects %s', (_label, override) => {
    expect(signupSchema.safeParse({ ...validSignup, ...override }).success).toBe(false);
  });

  it('rejects an attempt to self-assign a privileged role', () => {
    const result = signupSchema.safeParse({ ...validSignup, role: 'ADMIN' });

    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('lowercases the email so login is case-insensitive', () => {
    expect(loginSchema.parse({ email: 'ADA@ONBOARDING.TEST', password: 'x' }).email).toBe(
      'ada@onboarding.test'
    );
  });

  it('requires a password', () => {
    expect(loginSchema.safeParse({ email: 'ada@onboarding.test', password: '' }).success).toBe(false);
  });
});
