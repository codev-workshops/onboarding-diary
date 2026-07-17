import { useState } from 'react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';
import { useAppConfig } from '@/hooks/useAppConfig';

const STEPS: Step[] = [
  {
    target: '[data-tour="sidebar"]',
    content:
      'Welcome! This is a demo environment pre-loaded with sample users, departments and entries — the login screen lists every demo account and its shared password. Use this navigation to move between your diary sections.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-tasks"]',
    content:
      'Log onboarding tasks and track their status. Give a task a due date — overdue tasks are flagged with a badge and a reminder on your dashboard (evaluated in your timezone, which an admin sets on your account). Admins can also seed a recruit’s tasks from a checklist template.',
  },
  {
    target: '[data-tour="activity-bell"]',
    content:
      'When a teammate @mentions you in a task comment (e.g. @manager.eng), it shows up here. The badge counts unread mentions; open the panel to jump straight to the task.',
  },
  {
    target: '[data-tour="nav-reports"]',
    content: 'Generate a report of your progress, then export it to PDF or CSV.',
  },
];

/**
 * Key under which the tour records that the user finished/skipped it for the
 * current browser session. `sessionStorage` (not `localStorage`) is deliberate: the
 * tour reappears on a fresh app restart but stays out of the way for the rest of
 * this session once dismissed.
 */
const SESSION_DONE_KEY = 'onboarding.tour.done';

function tourDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DONE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markTourDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_DONE_KEY, 'true');
  } catch {
    // Storage unavailable (e.g. private mode); the in-memory `run` flag still hides it.
  }
}

/**
 * The onboarding tour is shown purely based on demo mode (docs/ASSUMPTIONS.md
 * §13/§21): the backend enables `onboardingEnablersEnabled` only in demo mode
 * (which always runs on SQLite/in-memory, never Postgres), so the tour runs in demo
 * and never in production. Finishing or skipping it turns it off for the rest of the
 * current browser session; restarting the app shows it again. This balances easy
 * onboarding against a distraction-free full experience once the tour is seen.
 */
export function Tour() {
  const { data: config } = useAppConfig();
  const [run, setRun] = useState(() => !tourDismissedThisSession());

  if (!config?.onboardingEnablersEnabled) return null;

  const handleCallback = (data: CallBackProps) => {
    const finished: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finished.includes(data.status)) {
      markTourDismissed();
      setRun(false);
    }
  };

  return (
    <Joyride
      run={run}
      steps={STEPS}
      continuous
      showSkipButton
      showProgress
      callback={handleCallback}
      styles={{ options: { primaryColor: 'hsl(221, 83%, 53%)', zIndex: 10000 } }}
    />
  );
}
