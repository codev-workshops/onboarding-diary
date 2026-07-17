import { describe, expect, it } from 'vitest';
import { landingPathFor } from './roles';

describe('landingPathFor', () => {
  it('maps each role to its own landing route', () => {
    expect(landingPathFor('Recruit')).toBe('/dashboard');
    expect(landingPathFor('Manager')).toBe('/team');
    expect(landingPathFor('Admin')).toBe('/overview');
  });
});
