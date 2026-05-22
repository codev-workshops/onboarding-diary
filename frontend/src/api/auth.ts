import apiClient from './client'
import type { AuthResponse, User } from '../types'

export const authApi = {
  register: (data: {
    email: string
    password: string
    fullName: string
    department?: string
    startDate?: string
  }) => apiClient.post<User>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  getProfile: () => apiClient.get<User>('/users/me'),

  updateProfile: (data: { fullName?: string; department?: string; startDate?: string }) =>
    apiClient.put<User>('/users/me', data),
}
