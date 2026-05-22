import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import Dashboard from '../Dashboard'

vi.mock('../../api/dashboard', () => ({
  dashboardApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        summary: {
          totalTasks: 5,
          completedTasks: 3,
          openIssues: 2,
          totalFeedback: 4,
          totalNotes: 1,
        },
        recentTasks: [{
          id: '1',
          date: '2026-01-15',
          title: 'Setup dev env',
          status: 'COMPLETED',
          priority: 'HIGH',
        }],
        recentIssues: [],
        recentFeedback: [],
        recentNotes: [],
        taskCompletionRate: 60,
      },
    }),
    getForUser: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('../../context/RecruitContext', () => ({
  useRecruit: vi.fn().mockReturnValue({
    selectedRecruitId: null,
    isManagerView: false,
    loading: false,
  }),
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: { success: vi.fn(), error: vi.fn() },
  }
})

function TestWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with summary statistics', async () => {
    render(<Dashboard />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Total Tasks')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Open Issues')).toBeInTheDocument()
    })
  })

  it('renders recent tasks tab', async () => {
    render(<Dashboard />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Recent Tasks')).toBeInTheDocument()
    })
  })
})
