import { describe, expect, it } from 'vitest';

import { LABEL_MAPS } from './labels.js';

describe('enum labels', () => {
  for (const { name, values, labels } of LABEL_MAPS) {
    it(`covers every ${name} value with a non-empty label`, () => {
      const lookup: Record<string, string> = labels;
      for (const value of values) {
        expect(lookup[value], `${name}.${value}`).toBeTruthy();
      }
      expect(Object.keys(labels).sort()).toEqual([...values].sort());
    });
  }
});
