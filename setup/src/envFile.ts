import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Serializes an env value, quoting it when it contains characters that would
 * otherwise break dotenv parsing.
 */
function serializeValue(value: string): string {
  if (/[\s"'#=]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Upserts the given keys into a dotenv file, preserving other lines/comments.
 * Existing keys are replaced in place; new keys are appended. The file is written
 * with owner-only permissions (0600) because it may hold secrets — a pragmatic
 * on-prem alternative to a secrets manager (SECURITY_REVIEW.md).
 *
 * Returns the resulting file content (callers must never log secret values).
 */
export function upsertEnvVars(path: string, vars: Record<string, string>): string {
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const lines = existing.length ? existing.split('\n') : [];
  const remaining = new Map(Object.entries(vars));

  const updated = lines.map((line) => {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match && remaining.has(match[1])) {
      const key = match[1];
      const value = remaining.get(key) as string;
      remaining.delete(key);
      return `${key}=${serializeValue(value)}`;
    }
    return line;
  });

  for (const [key, value] of remaining) {
    updated.push(`${key}=${serializeValue(value)}`);
  }

  const content = `${updated.join('\n').replace(/\n+$/, '')}\n`;
  writeFileSync(path, content, { mode: 0o600 });
  return content;
}

/** Reads a non-placeholder JWT_SECRET from an existing dotenv file, if present. */
export function readExistingJwtSecret(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const match = /^\s*JWT_SECRET\s*=\s*"?([^"\n]+)"?/m.exec(readFileSync(path, 'utf8'));
  const value = match?.[1]?.trim();
  return value && value !== 'dev-only-change-me' ? value : undefined;
}
