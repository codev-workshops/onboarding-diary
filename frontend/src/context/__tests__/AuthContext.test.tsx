import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../AuthContext'
import type { User } from '../../types'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

const mockUser: User = {
  id: '1',
  email: 'test@test.com',
  fullName: 'Test User',
  role: 'RECRUIT',
  department: 'Engineering',
  startDate: '2026-01-01',
  managerId: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides default unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('login sets user and token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('jwt-token', mockUser)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.token).toBe('jwt-token')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('logout clears user and token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('jwt-token', mockUser)
    })
    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('updateUser updates current user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('jwt-token', mockUser)
    })

    const updatedUser = { ...mockUser, fullName: 'Updated Name' }
    act(() => {
      result.current.updateUser(updatedUser)
    })

    expect(result.current.user?.fullName).toBe('Updated Name')
  })

  it('persists token to localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.login('jwt-token', mockUser)
    })

    expect(localStorage.getItem('token')).toBe('jwt-token')
  })

  it('restores state from localStorage', () => {
    localStorage.setItem('token', 'stored-token')
    localStorage.setItem('user', JSON.stringify(mockUser))

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.token).toBe('stored-token')
    expect(result.current.user?.email).toBe('test@test.com')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within AuthProvider')
  })
})
