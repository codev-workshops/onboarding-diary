import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import TaskList from '../tasks/TaskList'

vi.mock('../../api/tasks', () => ({
  tasksApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        content: [
          {
            id: '1',
            userId: 'user-1',
            date: '2026-01-15',
            title: 'Setup dev environment',
            description: 'Install tools',
            category: 'SETUP',
            status: 'COMPLETED',
            priority: 'HIGH',
            createdAt: '2026-01-15T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
          },
          {
            id: '2',
            userId: 'user-1',
            date: '2026-01-16',
            title: 'Read documentation',
            description: 'Read onboarding docs',
            category: 'DOCUMENTATION',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            createdAt: '2026-01-16T00:00:00Z',
            updatedAt: '2026-01-16T00:00:00Z',
          },
        ],
        totalElements: 2,
        totalPages: 1,
        size: 20,
        number: 0,
      },
    }),
    listForUser: vi.fn().mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 } }),
    delete: vi.fn().mockResolvedValue({}),
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

describe('TaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders task list page with title', async () => {
    render(<TaskList />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Tasks')).toBeInTheDocument()
    })
  })

  it('shows New Task button for recruits', async () => {
    render(<TaskList />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument()
    })
  })

  it('hides New Task button in manager view', async () => {
    const { useRecruit } = await import('../../context/RecruitContext')
    vi.mocked(useRecruit).mockReturnValue({
      selectedRecruitId: 'recruit-1',
      isManagerView: true,
      loading: false,
      recruits: [],
      setSelectedRecruitId: vi.fn(),
    })

    render(<TaskList />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Tasks')).toBeInTheDocument()
    })

    expect(screen.queryByText('New Task')).not.toBeInTheDocument()
  })

  it('displays task data in table', async () => {
    const { useRecruit } = await import('../../context/RecruitContext')
    vi.mocked(useRecruit).mockReturnValue({
      selectedRecruitId: null,
      isManagerView: false,
      loading: false,
      recruits: [],
      setSelectedRecruitId: vi.fn(),
    })

    render(<TaskList />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Setup dev environment')).toBeInTheDocument()
      expect(screen.getByText('Read documentation')).toBeInTheDocument()
    })
  })
})
