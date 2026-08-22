/**
 * Narrows a caller-supplied redirect target to a path on this origin. A bare
 * `startsWith('/')` is not enough: `//evil.com` and `/\evil.com` are treated as
 * protocol-relative URLs by browsers, so they would leave the site (S9).
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
