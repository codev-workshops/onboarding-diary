import type { Db } from './db.js';
import { DEFAULT_TASK_CATEGORIES } from '../../server/src/domain/enums.js';

/**
 * Seeds the minimal reference data a production database needs to function: the
 * default (admin-editable) task categories. Enum-like values (statuses,
 * priorities, severities, feedback types, roles) are code-defined constants and
 * are NOT stored in the database, so categories are the only reference rows
 * (docs/ASSUMPTIONS.md §13).
 *
 * Idempotent and strictly additive — only creates missing categories, never
 * deletes or overwrites, and never creates demo accounts or entries.
 */
export async function seedReferenceData(db: Db): Promise<number> {
  let created = 0;
  for (const name of DEFAULT_TASK_CATEGORIES) {
    const existing = await db.taskCategory.findUnique({ where: { name } });
    if (!existing) {
      await db.taskCategory.create({ data: { name } });
      created += 1;
    }
  }
  return created;
}
