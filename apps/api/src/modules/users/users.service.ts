import type { Prisma } from '@prisma/client';
import type {
  UserDto,
  UserWithProfileDto,
  RecruitProfileDto,
  UserListQuerySchema,
  UpdateProfileSchema,
  UpdateRecruitProfileSchema,
  UpdateRoleSchema,
  UpdateStatusSchema,
  PaginatedResponse,
} from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../errors/AppError.js';
import { Role } from '@onboarding-diary/shared';

function toUserDto(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    avatar_url: user.avatarUrl,
    role: user.role as UserDto['role'],
    status: user.status as UserDto['status'],
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

function toRecruitProfileDto(profile: {
  id: string;
  userId: string;
  department: string | null;
  position: string | null;
  startDate: Date | null;
  expectedEndDate: Date | null;
  bio: string | null;
  onboardingStatus: string;
  createdAt: Date;
  updatedAt: Date;
}): RecruitProfileDto {
  return {
    id: profile.id,
    user_id: profile.userId,
    department: profile.department,
    position: profile.position,
    start_date: profile.startDate?.toISOString() ?? null,
    expected_end_date: profile.expectedEndDate?.toISOString() ?? null,
    bio: profile.bio,
    onboarding_status: profile.onboardingStatus,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };
}

const SORT_FIELD_MAP: Record<string, string> = {
  created_at: 'createdAt',
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  role: 'role',
  status: 'status',
};

export async function listUsers(query: UserListQuerySchema): Promise<PaginatedResponse<UserDto>> {
  const { page, limit, sort_by, sort_order, role, status, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput = {
    [SORT_FIELD_MAP[sort_by] ?? 'createdAt']: sort_order,
  };

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({ where, orderBy, skip, take: limit }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: users.map(toUserDto),
    meta: {
      page,
      limit,
      total_count: totalCount,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}

export async function getUserById(userId: string): Promise<UserWithProfileDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    include: { recruitProfile: true },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return {
    ...toUserDto(user),
    recruit_profile: user.recruitProfile ? toRecruitProfileDto(user.recruitProfile) : null,
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileSchema,
): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user) {
    throw new NotFoundError('User');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.first_name !== undefined ? { firstName: input.first_name } : {}),
      ...(input.last_name !== undefined ? { lastName: input.last_name } : {}),
      ...(input.avatar_url !== undefined ? { avatarUrl: input.avatar_url } : {}),
    },
  });

  return toUserDto(updated);
}

export async function updateRecruitProfile(
  userId: string,
  input: UpdateRecruitProfileSchema,
): Promise<RecruitProfileDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    include: { recruitProfile: true },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  if (user.role !== Role.RECRUIT) {
    throw new BadRequestError('Only users with the RECRUIT role have a recruit profile');
  }

  const data: Prisma.RecruitProfileUpdateInput = {};
  if (input.department !== undefined) data.department = input.department;
  if (input.position !== undefined) data.position = input.position;
  if (input.start_date !== undefined) {
    data.startDate = input.start_date ? new Date(input.start_date) : null;
  }
  if (input.expected_end_date !== undefined) {
    data.expectedEndDate = input.expected_end_date ? new Date(input.expected_end_date) : null;
  }
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.onboarding_status !== undefined) data.onboardingStatus = input.onboarding_status;

  if (user.recruitProfile) {
    const updated = await prisma.recruitProfile.update({
      where: { userId },
      data,
    });
    return toRecruitProfileDto(updated);
  }

  const created = await prisma.recruitProfile.create({
    data: {
      userId,
      department: input.department ?? null,
      position: input.position ?? null,
      startDate: input.start_date ? new Date(input.start_date) : null,
      expectedEndDate: input.expected_end_date ? new Date(input.expected_end_date) : null,
      bio: input.bio ?? null,
      onboardingStatus: input.onboarding_status ?? 'NOT_STARTED',
    },
  });
  return toRecruitProfileDto(created);
}

export async function updateRole(
  targetUserId: string,
  input: UpdateRoleSchema,
  requesterId: string,
): Promise<UserDto> {
  if (targetUserId === requesterId) {
    throw new ForbiddenError('You cannot change your own role');
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId, deletedAt: null } });
  if (!user) {
    throw new NotFoundError('User');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: input.role },
  });

  return toUserDto(updated);
}

export async function updateStatus(
  targetUserId: string,
  input: UpdateStatusSchema,
  requesterId: string,
): Promise<UserDto> {
  if (targetUserId === requesterId) {
    throw new ForbiddenError('You cannot change your own status');
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId, deletedAt: null } });
  if (!user) {
    throw new NotFoundError('User');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: input.status },
  });

  return toUserDto(updated);
}

export async function deleteUser(
  targetUserId: string,
  requesterId: string,
): Promise<void> {
  if (targetUserId === requesterId) {
    throw new ForbiddenError('You cannot delete your own account');
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId, deletedAt: null } });
  if (!user) {
    throw new NotFoundError('User');
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });
}
