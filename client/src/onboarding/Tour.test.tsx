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
  default: ({ run, callback }: { run?: boolean; callback: (data: CallBackProps) => void }) =>
    run === false ? null : (
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
  sessionStorage.clear();
});

describe('Tour', () => {
  it('renders nothing when onboarding enablers are disabled', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ onboardingEnablersEnabled: false }));
    renderTour();
    await waitFor(() => {
      expect(screen.queryByText('finish-tour')).not.toBeInTheDocument();
    });
  });

  it('shows the tour in demo mode even if a legacy localStorage flag is set', async () => {
    // Suppression is session-scoped now; a stale localStorage flag from a previous
    // build must not suppress the demo tour.
    localStorage.setItem('onboarding.tour.done', 'true');
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ onboardingEnablersEnabled: true }));
    renderTour();
    expect(await screen.findByText('finish-tour')).toBeInTheDocument();
  });

  it('suppresses the tour for the rest of the session once dismissed', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ onboardingEnablersEnabled: true }));
    const first = renderTour();
    const btn = await screen.findByText('finish-tour');
    await userEvent.click(btn);
    await waitFor(() => {
      expect(screen.queryByText('finish-tour')).not.toBeInTheDocument();
    });
    // The dismissal is recorded only in sessionStorage (reappears on restart).
    expect(sessionStorage.getItem('onboarding.tour.done')).toBe('true');
    expect(localStorage.getItem('onboarding.tour.done')).toBeNull();

    // A re-mount within the same session (e.g. reload) keeps the tour hidden.
    first.unmount();
    renderTour();
    await waitFor(() => {
      expect(screen.queryByText('finish-tour')).not.toBeInTheDocument();
    });
  });
});
