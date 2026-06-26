import api from './api';
import {
  AdminUser,
  CreateUserRequest,
  UpdateUserRequest,
  UserStatusRequest,
  AssignManagerRequest,
  UserFilterParams,
  PaginatedResponse,
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/types';

// User management

export async function getUsers(params: UserFilterParams): Promise<PaginatedResponse<AdminUser>> {
  const response = await api.get<PaginatedResponse<AdminUser>>('/admin/users', { params });
  return response.data;
}

export async function getUserById(id: number): Promise<AdminUser> {
  const response = await api.get<AdminUser>(`/admin/users/${id}`);
  return response.data;
}

export async function createUser(data: CreateUserRequest): Promise<AdminUser> {
  const response = await api.post<AdminUser>('/admin/users', data);
  return response.data;
}

export async function updateUser(id: number, data: UpdateUserRequest): Promise<AdminUser> {
  const response = await api.put<AdminUser>(`/admin/users/${id}`, data);
  return response.data;
}

export async function updateUserStatus(id: number, data: UserStatusRequest): Promise<AdminUser> {
  const response = await api.patch<AdminUser>(`/admin/users/${id}/status`, data);
  return response.data;
}

export async function assignManager(userId: number, data: AssignManagerRequest): Promise<AdminUser> {
  const response = await api.put<AdminUser>(`/admin/users/${userId}/assign`, data);
  return response.data;
}

// Department management

export async function getDepartments(): Promise<Department[]> {
  const response = await api.get<Department[]>('/admin/departments');
  return response.data;
}

export async function createDepartment(data: CreateDepartmentRequest): Promise<Department> {
  const response = await api.post<Department>('/admin/departments', data);
  return response.data;
}

export async function updateDepartment(id: number, data: UpdateDepartmentRequest): Promise<Department> {
  const response = await api.put<Department>(`/admin/departments/${id}`, data);
  return response.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await api.delete(`/admin/departments/${id}`);
}

// Category management

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<Category[]>('/admin/categories');
  return response.data;
}

export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  const response = await api.post<Category>('/admin/categories', data);
  return response.data;
}

export async function updateCategory(id: number, data: UpdateCategoryRequest): Promise<Category> {
  const response = await api.put<Category>(`/admin/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/admin/categories/${id}`);
}
