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

function details(fields: string[]): ErrorDetail[] {
  return fields.map((field) => ({ field, code: 'FIELD_NOT_PERMITTED' }));
}
