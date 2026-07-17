import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMEZONE, TIMEZONES, timezoneOptions } from './constants';

describe('timezone constants', () => {
  it('defaults to Asia/Kolkata and includes UTC', () => {
    expect(DEFAULT_TIMEZONE).toBe('Asia/Kolkata');
    expect(TIMEZONES).toContain('UTC');
    expect(TIMEZONES).toContain('Asia/Kolkata');
  });

  it('returns the base list when the current value is already present', () => {
    expect(timezoneOptions('UTC')).toEqual(TIMEZONES);
    expect(timezoneOptions()).toEqual(TIMEZONES);
  });

  it('prepends a stored value that is not in the runtime list', () => {
    const options = timezoneOptions('Etc/GMT+3');
    expect(options[0]).toBe('Etc/GMT+3');
    expect(options).toContain('Asia/Kolkata');
  });
});
