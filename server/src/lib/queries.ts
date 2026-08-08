import { db } from '../db.js';
import type { EntityDefinition } from './entities.js';
import type { EntityName } from './types.js';

export type EntryRow = Record<string, string | number | null>;
export type SqlParam = string | number;

export interface ListOptions {
  userIds: ReadonlyArray<number>;
  from?: string;
  to?: string;
  filters?: Readonly<Record<string, string>>;
  search?: string;
  limit?: number;
}

const quote = (column: string): string => `"${column}"`;

export const listEntries = (entity: EntityDefinition, options: ListOptions): EntryRow[] => {
  const selected = [
    'e.id AS id',
    'e.user_id AS userId',
    'u.name AS userName',
    ...entity.columns.map((column) => `e.${quote(column)} AS ${quote(column)}`),
    'e.created_at AS createdAt',
    'e.updated_at AS updatedAt',
  ].join(', ');

  const where: string[] = [];
  const params: SqlParam[] = [];

  if (options.userIds.length === 0) {
    return [];
  }
  where.push(`e.user_id IN (${options.userIds.map(() => '?').join(', ')})`);
  params.push(...options.userIds);

  if (options.from) {
    where.push('e.date >= ?');
    params.push(options.from);
  }
  if (options.to) {
    where.push('e.date <= ?');
    params.push(options.to);
  }
  for (const column of entity.filterColumns) {
    const value = options.filters?.[column];
    if (value) {
      where.push(`e.${quote(column)} = ?`);
      params.push(value);
    }
  }
  if (options.search) {
    const clauses = entity.searchColumns.map((column) => `e.${quote(column)} LIKE ?`);
    where.push(`(${clauses.join(' OR ')})`);
    params.push(...entity.searchColumns.map(() => `%${options.search}%`));
  }

  const limit = options.limit ? ` LIMIT ${Math.max(1, Math.min(options.limit, 500))}` : '';
  const sql =
    `SELECT ${selected} FROM ${entity.table} e JOIN users u ON u.id = e.user_id ` +
    `WHERE ${where.join(' AND ')} ORDER BY e.date DESC, e.id DESC${limit}`;

  return db.prepare(sql).all(...params) as EntryRow[];
};

export const findEntry = (table: EntityName, id: number): EntryRow | undefined =>
  db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as EntryRow | undefined;

export const countBy = (
  table: EntityName,
  userIds: ReadonlyArray<number>,
  column?: string,
): Array<{ key: string | null; count: number }> => {
  if (userIds.length === 0) {
    return [];
  }
  const placeholders = userIds.map(() => '?').join(', ');
  const keyExpr = column ? quote(column) : `'all'`;
  const sql =
    `SELECT ${keyExpr} AS key, COUNT(*) AS count FROM ${table} ` +
    `WHERE user_id IN (${placeholders}) GROUP BY ${keyExpr}`;
  return db.prepare(sql).all(...userIds) as Array<{ key: string | null; count: number }>;
};
