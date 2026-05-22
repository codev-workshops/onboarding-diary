import { describe, it, expect, vi } from 'vitest'
import { authApi } from '../auth'

vi.mock('../client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import apiClient from '../client'

describe('authApi', () => {
  it('register calls POST /auth/register', async () => {
    const data = {
      email: 'test@test.com',
      password: 'Test1234!',
      fullName: 'Test User',
    }

    await authApi.register(data)

    expect(apiClient.post).toHaveBeenCalledWith('/auth/register', data)
  })

  it('login calls POST /auth/login', async () => {
    const data = { email: 'test@test.com', password: 'Test1234!' }

    await authApi.login(data)

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', data)
  })

  it('getProfile calls GET /users/me', async () => {
    await authApi.getProfile()

    expect(apiClient.get).toHaveBeenCalledWith('/users/me')
  })

  it('updateProfile calls PUT /users/me', async () => {
    const data = { fullName: 'Updated Name' }

    await authApi.updateProfile(data)

    expect(apiClient.put).toHaveBeenCalledWith('/users/me', data)
  })
})
