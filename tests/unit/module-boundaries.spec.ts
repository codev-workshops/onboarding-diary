import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The ESLint boundary rule is the enforcement; this is the assertion that says
 * why, and it fails loudly in the test report rather than in a lint warning
 * somebody might land past. A route handler holding a Prisma delegate is one
 * forgotten `where` away from serving another recruit's diary.
 */
function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('module boundaries', () => {
  it('no route handler, page or component imports the database client', () => {
    const offenders = [...filesUnder('app'), ...filesUnder('components')].filter((path) =>
      /from '@\/src\/shared\/db\/prisma'/.test(readFileSync(path, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });

  it('only the repository module holds an entry delegate', () => {
    const allowed = new Set([
      join('src', 'modules', 'entries', 'repositories.ts'),
      join('src', 'modules', 'entries', 'base-repository.ts'),
    ]);

    const offenders = filesUnder('src').filter(
      (path) =>
        !allowed.has(path) &&
        /\b(taskEntry|issueEntry|feedbackEntry|noteEntry)\./.test(readFileSync(path, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
