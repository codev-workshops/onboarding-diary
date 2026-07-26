import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createUser } from './helpers/factories.js';

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

/** Guards T-037: suites must not see rows created by another suite or another test. */
describe('integration harness isolation', () => {
  it('starts from an empty database', async () => {
    expect(await getTestDb().user.count()).toBe(0);
    await createUser();
    expect(await getTestDb().user.count()).toBe(1);
  });

  it('starts from an empty database again in the next test', async () => {
    expect(await getTestDb().user.count()).toBe(0);
  });
});
