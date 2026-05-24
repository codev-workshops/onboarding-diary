import type { Role, UserStatus } from '../enums';

export interface UserDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  department: string | null;
  role: Role;
  status: UserStatus;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  bio?: string;
  department?: string;
  avatar_url?: string;
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
