import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import Analytics from '../Analytics'

vi.mock('../../api/analytics', () => ({
  analyticsApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        tasksByStatus: { COMPLETED: 5, IN_PROGRESS: 3 },
        tasksByCategory: { TRAINING: 2, SETUP: 3 },
        tasksByPriority: { HIGH: 4, LOW: 1 },
        issuesBySeverity: { HIGH: 2 },
        issuesByStatus: { OPEN: 1, RESOLVED: 1 },
        feedbackByType: { POSITIVE: 3, SUGGESTION: 1 },
        weeklyActivity: [
          { week: '2026-01-06', tasks: 3, issues: 1, feedback: 0, notes: 1 },
        ],
        taskCompletionRate: 62.5,
        totalEntries: 15,
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

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: { success: vi.fn(), error: vi.fn() },
  }
})

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders analytics page with title', async () => {
    render(<Analytics />)

    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })
  })

  it('shows total entries statistic', async () => {
    render(<Analytics />)

    await waitFor(() => {
      expect(screen.getByText('Total Entries')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })
  })

  it('renders chart cards', async () => {
    render(<Analytics />)

    await waitFor(() => {
      expect(screen.getByText('Tasks by Status')).toBeInTheDocument()
      expect(screen.getByText('Tasks by Category')).toBeInTheDocument()
      expect(screen.getByText('Issues by Severity')).toBeInTheDocument()
      expect(screen.getByText('Feedback by Type')).toBeInTheDocument()
    })
  })
})
