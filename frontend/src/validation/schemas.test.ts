import { passwordSchema, passwordStrength, signupSchema } from './schemas';

describe('passwordSchema', () => {
  it.each(['Secret123', 'Abcdefg1'])('accepts %s', (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(true);
  });

  it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere'])(
    'rejects %s',
    (password) => {
      expect(passwordSchema.safeParse(password).success).toBe(false);
    },
  );
});

describe('signupSchema', () => {
  const valid = {
    email: 'asha@example.com',
    password: 'Secret123',
    confirmPassword: 'Secret123',
    fullName: 'Asha',
    department: 'Engineering',
    startDate: '2026-09-21',
  };

  it('accepts a valid form', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['202611-09-01', '2026-02-30', '26-09-01'])('rejects start date %s', (startDate) => {
    const result = signupSchema.safeParse({ ...valid, startDate });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['startDate']);
  });

  it('flags mismatched confirmation', () => {
    const result = signupSchema.safeParse({ ...valid, confirmPassword: 'Other1234' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
  });
});

describe('passwordStrength', () => {
  it('scores stronger passwords higher', () => {
    expect(passwordStrength('abc')).toBe(0);
    expect(passwordStrength('Secret123!')).toBe(4);
  });
});
