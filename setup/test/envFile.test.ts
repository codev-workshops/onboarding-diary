import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readExistingJwtSecret, upsertEnvVars } from '../src/envFile.js';

function tmpEnvPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'setup-env-')), '.env');
}

describe('upsertEnvVars', () => {
  it('creates a new file with the given vars and 0600 perms', () => {
    const path = tmpEnvPath();
    upsertEnvVars(path, { DB_STRING: 'postgresql://u:p@h:5432/db', JWT_SECRET: 'abc' });
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('DB_STRING=postgresql://u:p@h:5432/db');
    expect(content).toContain('JWT_SECRET=abc');
    // Owner-only permissions.
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it('replaces existing keys in place and preserves other lines/comments', () => {
    const path = tmpEnvPath();
    writeFileSync(path, '# comment\nPORT=4000\nDB_STRING=old\n');
    upsertEnvVars(path, { DB_STRING: 'new' });
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('# comment');
    expect(content).toContain('PORT=4000');
    expect(content).toContain('DB_STRING=new');
    expect(content).not.toContain('DB_STRING=old');
  });

  it('quotes values containing spaces or special characters', () => {
    const path = tmpEnvPath();
    upsertEnvVars(path, { X: 'a b#c' });
    expect(readFileSync(path, 'utf8')).toContain('X="a b#c"');
  });
});

describe('readExistingJwtSecret', () => {
  it('returns undefined when the file is missing', () => {
    expect(readExistingJwtSecret(tmpEnvPath())).toBeUndefined();
  });

  it('ignores the placeholder secret', () => {
    const path = tmpEnvPath();
    writeFileSync(path, 'JWT_SECRET=dev-only-change-me\n');
    expect(readExistingJwtSecret(path)).toBeUndefined();
  });

  it('returns a real secret (quoted or unquoted)', () => {
    const path = tmpEnvPath();
    writeFileSync(path, 'JWT_SECRET="real-secret-value"\n');
    expect(readExistingJwtSecret(path)).toBe('real-secret-value');
  });
});
