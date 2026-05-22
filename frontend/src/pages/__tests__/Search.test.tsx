import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import SearchPage from '../Search'

vi.mock('../../api/search', () => ({
  searchApi: {
    search: vi.fn().mockResolvedValue({
      data: {
        results: [
          {
            id: '1',
            type: 'TASK',
            title: 'Setup VPN',
            description: 'Configure VPN access',
            date: '2026-01-15',
            highlight: 'Setup VPN access',
          },
          {
            id: '2',
            type: 'ISSUE',
            title: 'VPN down',
            description: 'VPN is not working',
            date: '2026-01-16',
            highlight: 'VPN is not working',
          },
        ],
        totalResults: 2,
      },
    }),
    searchForUser: vi.fn().mockResolvedValue({ data: { results: [], totalResults: 0 } }),
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

function createWrapper(search: string = '') {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[`/search${search}`]}>{children}</MemoryRouter>
  )
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search page with input', async () => {
    render(<SearchPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search across tasks, issues, feedback, and notes...')).toBeInTheDocument()
    })
  })

  it('shows results when query is provided', async () => {
    render(<SearchPage />, { wrapper: createWrapper('?q=VPN') })

    await waitFor(() => {
      expect(screen.getByText('Setup VPN')).toBeInTheDocument()
      expect(screen.getByText('VPN down')).toBeInTheDocument()
    })
  })

  it('shows result count', async () => {
    render(<SearchPage />, { wrapper: createWrapper('?q=VPN') })

    await waitFor(() => {
      expect(screen.getByText(/2 results for/)).toBeInTheDocument()
    })
  })
})
