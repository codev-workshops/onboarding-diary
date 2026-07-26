import { describe, expect, it } from 'vitest';

import { SERVICE_NAME } from './index.js';

describe('api package', () => {
  it('exposes its service name', () => {
    expect(SERVICE_NAME).toBe('onboarding-diary-api');
  });
});
