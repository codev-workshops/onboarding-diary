export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'danger';

export interface BadgeProps {
  children: string;
  tone?: BadgeTone;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: '',
  primary: 'badge--primary',
  accent: 'badge--accent',
  danger: 'badge--danger',
};

export const Badge = ({ children, tone = 'neutral' }: BadgeProps) => (
  <span className={['badge', TONE_CLASS[tone]].filter(Boolean).join(' ')}>{children}</span>
);

const DANGER_VALUES = new Set(['Blocked', 'Critical', 'High', 'Concern']);
const PRIMARY_VALUES = new Set(['Completed', 'Resolved', 'Positive']);
const ACCENT_VALUES = new Set(['In progress', 'Suggestion', 'Medium']);

export const toneForValue = (value: string): BadgeTone => {
  if (DANGER_VALUES.has(value)) {
    return 'danger';
  }
  if (PRIMARY_VALUES.has(value)) {
    return 'primary';
  }
  if (ACCENT_VALUES.has(value)) {
    return 'accent';
  }
  return 'neutral';
};
