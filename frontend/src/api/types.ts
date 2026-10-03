export type Role = 'RECRUIT' | 'MANAGER' | 'ADMIN';

export interface Profile {
  fullName: string;
  jobTitle: string | null;
  department: string;
  startDate: string;
  managerId: number | null;
  managerEmail: string | null;
}

export interface User {
  id: number;
  email: string;
  roles: Role[];
  mustChangePassword: boolean;
  profile: Profile;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  jobTitle?: string;
  department: string;
  startDate: string;
}

export interface ProfileUpdateRequest {
  fullName: string;
  jobTitle?: string;
  department: string;
  startDate: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  errors?: FieldError[];
}
