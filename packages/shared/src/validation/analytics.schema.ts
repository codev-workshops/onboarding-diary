import { z } from 'zod';

export const analyticsParamsSchema = z.object({
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  recruit_id: z.string().uuid().optional(),
});

export type AnalyticsParamsSchema = z.infer<typeof analyticsParamsSchema>;
