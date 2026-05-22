import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RecruitProvider, useRecruit } from '../RecruitContext'
import { AuthProvider } from '../AuthContext'
import type { User } from '../../types'

vi.mock('../../api/users', () => ({
  usersApi: {
    getMyRecruits: vi.fn(),
  },
}))

import { usersApi } from '../../api/users'

const mockRecruit: User = {
  id: 'recruit-1',
  email: 'recruit@test.com',
  fullName: 'Test Recruit',
  role: 'RECRUIT',
  department: 'Engineering',
  startDate: '2026-01-01',
  managerId: 'manager-1',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function createWrapper(role: string) {
  return ({ children }: { children: ReactNode }) => {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify({
      id: 'manager-1',
      email: 'manager@test.com',
      fullName: 'Manager',
      role,
      department: 'Engineering',
      startDate: null,
      managerId: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }))
    return (
      <AuthProvider>
        <RecruitProvider>{children}</RecruitProvider>
      </AuthProvider>
    )
  }
}

describe('RecruitContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('fetches recruits for managers', async () => {
    vi.mocked(usersApi.getMyRecruits).mockResolvedValue({
      data: [mockRecruit],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    })

    const { result } = renderHook(() => useRecruit(), { wrapper: createWrapper('MANAGER') })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.recruits).toHaveLength(1)
    expect(result.current.selectedRecruitId).toBe('recruit-1')
    expect(result.current.isManagerView).toBe(true)
  })

  it('does not fetch recruits for recruits', async () => {
    const { result } = renderHook(() => useRecruit(), { wrapper: createWrapper('RECRUIT') })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.recruits).toHaveLength(0)
    expect(result.current.selectedRecruitId).toBeNull()
    expect(result.current.isManagerView).toBe(false)
    expect(usersApi.getMyRecruits).not.toHaveBeenCalled()
  })

  it('handles API error gracefully', async () => {
    vi.mocked(usersApi.getMyRecruits).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useRecruit(), { wrapper: createWrapper('MANAGER') })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.recruits).toHaveLength(0)
  })

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useRecruit())
    }).toThrow('useRecruit must be used within RecruitProvider')
  })
})
