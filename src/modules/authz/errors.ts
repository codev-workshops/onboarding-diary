import { AppError, type ErrorDetail } from '@/src/shared/http/errors';

/**
 * The 403-versus-404 policy, in one place because consistency is the whole
 * point (spec §11.7):
 *
 *   - The caller *named* a subject they may not reach (`owner_id`, `user_ids`)
 *     -> 403 OUT_OF_SCOPE. They supplied the identifier, so echoing that it is
 *     out of scope discloses nothing they did not already know.
 *   - The caller addressed a resource by id that they cannot see
 *     -> 404 NOT_FOUND. Anything else would confirm the row exists.
 *   - The caller's role lacks the capability entirely -> 403 INSUFFICIENT_ROLE.
 *     Route existence is public knowledge.
 *   - The caller may touch the resource but not those fields
 *     -> 403 FIELD_NOT_PERMITTED / FORBIDDEN_FIELD, and the whole request is
 *     rejected rather than partially applied.
 */

export const outOfScope = (subject = 'The requested user is outside your scope.'): AppError =>
  new AppError('OUT_OF_SCOPE', subject);

export const insufficientRole = (): AppError =>
  new AppError('INSUFFICIENT_ROLE', 'Your role does not permit this operation.');

/** Positions, never identities: naming the offending ids would leak them back. */
export function outOfScopeAt(positions: number[]): AppError {
  return new AppError(
    'OUT_OF_SCOPE',
    'One or more requested users are outside your scope.',
    positions.map((index) => ({ field: `user_ids[${index}]`, code: 'OUT_OF_SCOPE' }))
  );
}

export function fieldNotPermitted(fields: string[]): AppError {
  return new AppError('FIELD_NOT_PERMITTED', 'Your role may not modify those fields.', details(fields));
}

export function forbiddenField(fields: string[]): AppError {
  return new AppError('FORBIDDEN_FIELD', 'Those fields cannot be changed here.', details(fields));
}

export const sectionNotPermitted = (section: string): AppError =>
  new AppError('SECTION_NOT_PERMITTED', 'That report section is not available to your role.', [
    { field: 'sections', code: 'SECTION_NOT_PERMITTED', message: section },
  ]);

export const notFound = (): AppError => new AppError('NOT_FOUND', 'The requested resource was not found.');

/**
 * The cap is what makes synchronous report generation safe (§17.5, O3), so the
 * refusal has to be actionable: it says how big the report would have been and
 * points at the two inputs the caller can change.
 */
export function reportTooLarge(section: string, rows: number, limit: number): AppError {
  return new AppError(
    'REPORT_TOO_LARGE',
    `This report would contain ${rows.toLocaleString('en-GB')} ${section.toLowerCase()} rows (limit ${limit.toLocaleString('en-GB')}). Narrow the date range or select fewer users.`,
    [
      { field: 'date_from', code: 'RANGE_TOO_WIDE' },
      { field: 'user_ids', code: 'TOO_MANY_ROWS', message: section },
    ]
  );
}

/**
 * The current version is disclosed because the caller already reached the row —
 * this is only ever raised after the scoped read succeeded — and because
 * without it the client cannot re-read and retry.
 */
export const versionConflict = (currentVersion: number): AppError =>
  new AppError('VERSION_CONFLICT', 'This entry changed since you loaded it. Reload and try again.', [
    { field: 'expected_version', code: 'VERSION_CONFLICT', message: String(currentVersion) },
  ]);

function details(fields: string[]): ErrorDetail[] {
  return fields.map((field) => ({ field, code: 'FIELD_NOT_PERMITTED' }));
}
