import { onboardingDay } from './dates';

describe('onboardingDay', () => {
  it('counts the start date as day 1', () => {
    expect(onboardingDay('2026-10-03', new Date(2026, 9, 3))).toBe(1);
    expect(onboardingDay('2026-09-21', new Date(2026, 9, 3))).toBe(13);
  });

  it('returns zero or less before the start date', () => {
    expect(onboardingDay('2026-10-05', new Date(2026, 9, 3))).toBe(-1);
  });
});
