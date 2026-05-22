import { describe, it, expect, beforeEach } from 'vitest'
import apiClient from '../client'

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has correct baseURL', () => {
    expect(apiClient.defaults.baseURL).toBe('/api/v1')
  })

  it('has Content-Type header set to JSON', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
  })

  it('adds Authorization header when token exists', async () => {
    localStorage.setItem('token', 'test-jwt-token')

    const config = await apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {} as any,
    } as any)

    expect(config.headers.Authorization).toBe('Bearer test-jwt-token')
  })

  it('does not add Authorization header without token', async () => {
    const config = await apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {} as any,
    } as any)

    expect(config.headers.Authorization).toBeUndefined()
  })
})
