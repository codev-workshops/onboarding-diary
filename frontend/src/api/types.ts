export type Role = "ADMIN" | "MANAGER" | "RECRUIT";
export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  department: string | null;
  joinDate: string | null;
  managerId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: UserResponse;
}

export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: { field: string; message: string }[];
}
