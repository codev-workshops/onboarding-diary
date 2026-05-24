import type { Role, UserStatus } from '../enums';

export interface UserDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: Role;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface RecruitProfileDto {
  id: string;
  user_id: string;
  department: string | null;
  position: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  bio: string | null;
  onboarding_status: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfileDto extends UserDto {
  recruit_profile: RecruitProfileDto | null;
}

export interface ManagerRecruitAssignmentDto {
  id: string;
  manager: Pick<UserDto, 'id' | 'email' | 'first_name' | 'last_name'>;
  recruit: Pick<UserDto, 'id' | 'email' | 'first_name' | 'last_name'>;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
}

export interface UpdateRecruitProfileInput {
  department?: string | null;
  position?: string | null;
  start_date?: string | null;
  expected_end_date?: string | null;
  bio?: string | null;
  onboarding_status?: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export interface UpdateRoleInput {
  role: Role;
}

export interface UpdateStatusInput {
  status: UserStatus;
}
