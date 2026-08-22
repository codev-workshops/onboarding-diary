import { z } from 'zod';

/**
 * The period is a day count rather than a free date range: the dashboard is a
 * "how is onboarding going right now" view, and every widget shares one window
 * (§16.3). Arbitrary ranges belong to reports, where they can be exported.
 */
export const PERIOD_CHOICES = [7, 30, 90, 365] as const;

export const dashboardQuerySchema = z
  .object({
    days: z.coerce
      .number()
      .int()
      .refine(
        (value) => PERIOD_CHOICES.includes(value as (typeof PERIOD_CHOICES)[number]),
        `Choose one of ${PERIOD_CHOICES.join(', ')} days.`
      )
      .default(30),
  })
  .strict();

export type DashboardQuery = z.output<typeof dashboardQuerySchema>;
