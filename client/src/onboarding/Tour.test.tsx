import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CallBackProps } from 'react-joyride';
import { Tour } from './Tour';

// Stub Joyride with a button that fires the finished callback, so we can assert
// the tour marks itself complete without mounting the real overlay/portal.
vi.mock('react-joyride', () => ({
  STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
  default: ({ callback }: { callback: (data: CallBackProps) => void }) => (
    <button onClick={() => callback({ status: 'finished' } as CallBackProps)}>finish-tour</button>
  ),
}));

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function renderTour() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Tour />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Tour', () => {
  it('renders nothing when onboarding enablers are disabled', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ onboardingEnablersEnabled: false }));
    renderTour();
    await waitFor(() => {
      expect(screen.queryByText('finish-tour')).not.toBeInTheDocument();
    });
  });

  it('renders nothing when the tour was already completed', () => {
    localStorage.setItem('onboarding.tour.done', 'true');
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ onboardingEnablersEnabled: true }));
    renderTour();
    expect(screen.queryByText('finish-tour')).not.toBeInTheDocument();
  });

  it('shows the tour in demo mode and persists completion', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ onboardingEnablersEnabled: true }));
    renderTour();
    const btn = await screen.findByText('finish-tour');
    await userEvent.click(btn);
    await waitFor(() => {
      expect(localStorage.getItem('onboarding.tour.done')).toBe('true');
    });
  });
});
