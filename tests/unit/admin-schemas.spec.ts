import { describe, expect, it } from 'vitest';

import { createDepartmentSchema, updateDepartmentSchema } from '@/src/modules/departments/schemas';
import {
  adminUserListQuerySchema,
  createUserSchema,
  updateUserSchema,
} from '@/src/modules/users/admin-schemas';

/**
 * The admin schemas are the outer edge of the privilege escalation surface:
 * every field an admin may set is enumerated here, so anything absent from the
 * schema is unreachable from a request no matter what the service does with the
 * object it is handed.
 */
const validCreate = {
  email: 'new.recruit@onboarding.test',
  full_name: 'New Recruit',
  start_date: '2026-03-02',
};

describe('createUserSchema', () => {
  it('defaults the role to RECRUIT and accepts a minimal body', () => {
    expect(createUserSchema.parse(validCreate)).toMatchObject({ role: 'RECRUIT' });
  });

  it.each([
    ['password', { password: 'hunter2' }],
    ['password_hash', { password_hash: '$2b$12$x' }],
    ['is_active', { is_active: false }],
    ['id', { id: '00000000-0000-4000-8000-000000000000' }],
  ])('refuses the unspeakable field %s', (_field, extra) => {
    expect(createUserSchema.safeParse({ ...validCreate, ...extra }).success).toBe(false);
  });

  it.each(['2026-02-30', '02-03-2026', 'yesterday', ''])('refuses the start date %s', (start_date) => {
    expect(createUserSchema.safeParse({ ...validCreate, start_date }).success).toBe(false);
  });

  it('refuses a manager id that is not a uuid rather than passing it to the database', () => {
    expect(createUserSchema.safeParse({ ...validCreate, manager_id: 'me' }).success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts a single field and allows clearing the manager and department', () => {
    expect(updateUserSchema.parse({ role: 'MANAGER' })).toEqual({ role: 'MANAGER' });
    expect(updateUserSchema.parse({ manager_id: null, department_id: null })).toEqual({
      manager_id: null,
      department_id: null,
    });
  });

  it('refuses an empty body and a body that only says where to move the reports', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(updateUserSchema.safeParse({ reassign_to: '00000000-0000-4000-8000-000000000000' }).success).toBe(
      false
    );
  });

  it('refuses an unknown field', () => {
    expect(updateUserSchema.safeParse({ full_name: 'Renamed', admin: true }).success).toBe(false);
  });
});

describe('adminUserListQuerySchema', () => {
  it('turns the activity filter into a boolean and leaves it undefined when absent', () => {
    expect(adminUserListQuerySchema.parse({ is_active: 'false' })).toEqual({ is_active: false });
    expect(adminUserListQuerySchema.parse({})).toEqual({});
  });

  it('refuses a role that is not a role', () => {
    expect(adminUserListQuerySchema.safeParse({ role: 'SUPERUSER' }).success).toBe(false);
  });
});

describe('department schemas', () => {
  it('trims the name and treats the description as optional', () => {
    expect(createDepartmentSchema.parse({ name: '  Platform  ' })).toEqual({ name: 'Platform' });
  });

  it('refuses an empty update and an unknown field', () => {
    expect(updateDepartmentSchema.safeParse({}).success).toBe(false);
    expect(updateDepartmentSchema.safeParse({ name: 'Ops', member_count: 0 }).success).toBe(false);
  });

  it('accepts a deactivation and a description that is cleared', () => {
    expect(updateDepartmentSchema.parse({ is_active: false })).toEqual({ is_active: false });
    expect(updateDepartmentSchema.parse({ description: null })).toEqual({ description: null });
  });
});
