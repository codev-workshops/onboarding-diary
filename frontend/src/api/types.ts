export type UserRole = 'NewRecruit' | 'Manager' | 'Admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  startDate: string;
  managerId: string | null;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  department: string;
  startDate: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  department: string;
  startDate: string;
}
