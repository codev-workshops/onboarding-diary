import { describe, expect, it } from 'vitest';

import { APP_NAME } from './index.js';

describe('web package', () => {
  it('exposes its app name', () => {
    expect(APP_NAME).toBe('onboarding-diary-web');
  });
});
