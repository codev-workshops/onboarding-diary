/**
 * @mention parsing (docs/ASSUMPTIONS.md §19). Mentions use the handle derived
 * from an account's email local-part (e.g. `@manager.eng` for
 * `manager.eng@demo.local`). Handles are matched case-insensitively.
 */

const MENTION_RE = /@([a-zA-Z0-9._-]+)/g;

/** Returns the unique, lower-cased mention handles found in a comment body. */
export function parseMentionHandles(body: string): string[] {
  const handles = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    handles.add(match[1].toLowerCase());
  }
  return [...handles];
}

/** The mention handle for an email address (its lower-cased local-part). */
export function handleForEmail(email: string): string {
  return email.split('@')[0].toLowerCase();
}
