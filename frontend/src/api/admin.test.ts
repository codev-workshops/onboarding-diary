import { describeDetails, generateTemporaryPassword } from './admin';

describe('admin helpers', () => {
  it('generates passwords that satisfy the policy', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTemporaryPassword()).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{14}$/);
    }
  });

  it('describes audit details', () => {
    expect(describeDetails('{"before":["RECRUIT"],"after":["MANAGER","RECRUIT"]}')).toBe(
      'before: RECRUIT · after: MANAGER, RECRUIT',
    );
    expect(describeDetails(null)).toBe('');
    expect(describeDetails('not json')).toBe('not json');
  });
});
