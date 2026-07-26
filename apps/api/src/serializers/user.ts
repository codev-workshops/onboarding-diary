import type { UserDto } from '@onboarding-diary/shared';

import type { User } from '../generated/prisma/client.js';

/** `entryDate`-style columns are plain dates and must not be timezone-shifted (FR-X7). */
export function toCalendarDate(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    startDate: toCalendarDate(user.startDate),
    managerId: user.managerId,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
