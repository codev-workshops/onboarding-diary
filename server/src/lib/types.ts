export type Role = 'recruit' | 'manager' | 'admin';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  department: string;
  start_date: string;
  manager_id: number | null;
  created_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  department: string;
  startDate: string;
  managerId: number | null;
}

export const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  department: row.department,
  startDate: row.start_date,
  managerId: row.manager_id,
});

export type EntityName = 'tasks' | 'issues' | 'feedback' | 'notes';

export interface CountRow {
  count: number;
}
