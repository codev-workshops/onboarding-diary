import { apiClient } from './client';
import { toQuery, type ListParams } from './diary';
import type { Page } from './diaryTypes';
import type { Profile, ProfileUpdateRequest, Role } from './types';

export const ROLES: Role[] = ['RECRUIT', 'MANAGER', 'ADMIN'];

export interface AdminUser {
  id: number;
  email: string;
  roles: Role[];
  enabled: boolean;
  mustChangePassword: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  profile: Profile;
}

export interface CreateUserRequest extends ProfileUpdateRequest {
  email: string;
  temporaryPassword: string;
  roles: Role[];
  managerId?: number | null;
}

export interface ManagerOption {
  id: number;
  fullName: string;
  email: string;
}

export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'PROFILE_UPDATED',
  'ROLES_CHANGED',
  'MANAGER_ASSIGNED',
  'USER_ENABLED',
  'USER_DISABLED',
  'PASSWORD_RESET',
  'REPORT_GENERATED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditUserRef {
  id: number;
  fullName: string | null;
  email: string | null;
}

export interface AuditEntry {
  id: number;
  createdAt: string;
  action: AuditAction;
  actor: AuditUserRef | null;
  target: AuditUserRef | null;
  details: string | null;
}

export async function listUsers(params: ListParams): Promise<Page<AdminUser>> {
  const { data } = await apiClient.get<Page<AdminUser>>('/admin/users', {
    params: toQuery(params),
  });
  return data;
}

export async function createUser(body: CreateUserRequest): Promise<AdminUser> {
  const { data } = await apiClient.post<AdminUser>('/admin/users', body);
  return data;
}

export async function updateUserProfile(
  id: number,
  body: ProfileUpdateRequest,
): Promise<AdminUser> {
  const { data } = await apiClient.put<AdminUser>(`/admin/users/${id}/profile`, body);
  return data;
}

export async function updateUserRoles(id: number, roles: Role[]): Promise<AdminUser> {
  const { data } = await apiClient.put<AdminUser>(`/admin/users/${id}/roles`, { roles });
  return data;
}

export async function assignManager(id: number, managerId: number | null): Promise<AdminUser> {
  const { data } = await apiClient.put<AdminUser>(`/admin/users/${id}/manager`, { managerId });
  return data;
}

export async function setUserEnabled(id: number, enabled: boolean): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/admin/users/${id}/status`, { enabled });
  return data;
}

export async function resetUserPassword(id: number): Promise<string> {
  const { data } = await apiClient.post<{ temporaryPassword: string }>(
    `/admin/users/${id}/reset-password`,
  );
  return data.temporaryPassword;
}

export async function fetchManagers(): Promise<ManagerOption[]> {
  const { data } = await apiClient.get<ManagerOption[]>('/admin/managers');
  return data;
}

export async function listAuditLog(params: ListParams): Promise<Page<AuditEntry>> {
  const { data } = await apiClient.get<Page<AuditEntry>>('/admin/audit-log', {
    params: toQuery(params),
  });
  return data;
}

/** Random password meeting the policy (upper, lower, digit; 14 chars). */
export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const random = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  const chars = [upper, lower, digits].map((set) => set[random(set.length)]);
  while (chars.length < 14) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Renders the stored JSON details as "key: value" pairs. */
export function describeDetails(details: string | null): string {
  if (!details) return '';
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
      .join(' · ');
  } catch {
    return details;
  }
}
