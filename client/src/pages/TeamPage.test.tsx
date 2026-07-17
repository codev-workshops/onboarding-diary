import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeamPage } from './TeamPage';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TeamPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeamPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders overseen recruits with their progress', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        recruits: [
          {
            id: 'r1',
            name: 'Rina Recruit',
            email: 'recruit.rina@demo.local',
            department: 'Engineering',
            taskTotal: 4,
            taskCompleted: 2,
            completionRate: 50,
            openIssues: 1,
            feedbackTotal: 1,
            noteTotal: 1,
          },
        ],
        totals: { recruits: 1, openIssues: 1, completionRate: 50 },
      }),
    );
    renderPage();
    expect(await screen.findByText('Rina Recruit')).toBeInTheDocument();
    expect(screen.getByText('recruit.rina@demo.local')).toBeInTheDocument();
    expect(screen.getByText(/2\/4 · 50%/)).toBeInTheDocument();
  });
});
