import { useState } from 'react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';
import { useAppConfig } from '@/hooks/useAppConfig';

const KEY = 'onboarding.tour.done';

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
      'Log onboarding tasks and track their status. Give a task a due date — overdue tasks are flagged with a badge and a reminder on your dashboard. Admins can also seed a recruit’s tasks from a checklist template.',
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
 * Guided first-use tour (docs/ASSUMPTIONS.md §2, §13). Shown only when onboarding
 * enablers are active (demo mode) and the user has not completed it before.
 */
export function Tour() {
  const { data: config } = useAppConfig();
  const [done, setDone] = useState(() => localStorage.getItem(KEY) === 'true');

  if (!config?.onboardingEnablersEnabled || done) return null;

  const handleCallback = (data: CallBackProps) => {
    const finished: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finished.includes(data.status)) {
      localStorage.setItem(KEY, 'true');
      setDone(true);
    }
  };

  return (
    <Joyride
      steps={STEPS}
      continuous
      showSkipButton
      showProgress
      callback={handleCallback}
      styles={{ options: { primaryColor: 'hsl(221, 83%, 53%)', zIndex: 10000 } }}
    />
  );
}
