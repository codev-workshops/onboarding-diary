export type Role = 'RECRUIT' | 'MANAGER' | 'ADMIN';

export interface UserRef {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  department: string | null;
  startDate: string | null;
  manager: UserRef | null;
  active: boolean;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const ROLE_LABELS: Record<Role, string> = {
  RECRUIT: 'Recruit',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
};
