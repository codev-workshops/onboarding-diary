export type Role = 'RECRUIT' | 'MANAGER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department?: string;
  startDate?: string;
  bio?: string;
  profileImageUrl?: string;
  managerId?: string;
  active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  department: string;
  startDate: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  token: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}
