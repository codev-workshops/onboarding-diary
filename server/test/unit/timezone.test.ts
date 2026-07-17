import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMEZONE, isValidTimezone } from '../../src/domain/timezone.js';

describe('isValidTimezone', () => {
  it('accepts valid IANA identifiers', () => {
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Asia/Kolkata')).toBe(true);
  });

  it('rejects unknown or empty identifiers', () => {
    expect(isValidTimezone('Not/AZone')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone('totally-bogus')).toBe(false);
  });

  it('defaults to UTC', () => {
    expect(DEFAULT_TIMEZONE).toBe('UTC');
    expect(isValidTimezone(DEFAULT_TIMEZONE)).toBe(true);
  });
});
