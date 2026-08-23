import { describe, expect, it } from 'vitest';

import {
  changePasswordSchema,
  FORBIDDEN_SELF_FIELDS,
  updateSelfSchema,
} from '@/src/modules/users/self-schemas';

describe('updateSelfSchema', () => {
  it('accepts the three self-editable fields', () => {
    const parsed = updateSelfSchema.parse({
      full_name: 'Priya Sharma',
      department_id: '11111111-1111-4111-8111-111111111111',
      start_date: '2026-02-01',
    });

    expect(parsed.full_name).toBe('Priya Sharma');
  });

  it('rejects an empty body', () => {
    expect(() => updateSelfSchema.parse({})).toThrow();
  });

  it.each(FORBIDDEN_SELF_FIELDS)('rejects %s as an unknown field', (field) => {
    expect(() => updateSelfSchema.parse({ full_name: 'Priya Sharma', [field]: 'x' })).toThrow();
  });

  it('rejects a malformed start date', () => {
    expect(() => updateSelfSchema.parse({ start_date: '01-02-2026' })).toThrow();
  });
});

describe('changePasswordSchema', () => {
  it('accepts a compliant change', () => {
    expect(() =>
      changePasswordSchema.parse({ current_password: 'anything', new_password: 'ReplacedPass1' })
    ).not.toThrow();
  });

  it.each([['short1A'], ['nouppercase1'], ['NOLOWERCASE1'], ['NoDigitsHere']])(
    'rejects %s as a new password',
    (password) => {
      expect(() =>
        changePasswordSchema.parse({ current_password: 'anything', new_password: password })
      ).toThrow();
    }
  );

  it('rejects an unknown field', () => {
    expect(() =>
      changePasswordSchema.parse({
        current_password: 'anything',
        new_password: 'ReplacedPass1',
        user_id: 'someone-else',
      })
    ).toThrow();
  });
});
