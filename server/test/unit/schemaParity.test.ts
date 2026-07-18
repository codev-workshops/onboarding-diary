import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards against drift between the SQLite and PostgreSQL schemas: everything
 * except the datasource/generator blocks (which legitimately differ) must match.
 */
function modelSection(file: string): string {
  const contents = readFileSync(join(process.cwd(), 'prisma', file), 'utf8');
  const match = /^model /m.exec(contents);
  if (!match) throw new Error(`No model definitions found in ${file}`);
  return contents.slice(match.index).trim();
}

describe('Prisma schema parity', () => {
  it('SQLite and PostgreSQL schemas share identical model definitions', () => {
    expect(modelSection('schema.prisma')).toEqual(modelSection('schema.postgres.prisma'));
  });
});
