import { z } from 'zod';
import { MILESTONE, PROGRAM } from '../constants';
import { MilestoneCategory } from '../enums';

export const createMilestoneSchema = z.object({
  name: z.string().min(MILESTONE.NAME_MIN_LENGTH).max(MILESTONE.NAME_MAX_LENGTH),
  description: z.string().max(MILESTONE.DESCRIPTION_MAX_LENGTH).optional(),
  target_day: z.number().int().min(1),
  category: z.nativeEnum(MilestoneCategory),
  sort_order: z.number().int().min(0),
});

export const createProgramSchema = z.object({
  name: z.string().min(PROGRAM.NAME_MIN_LENGTH).max(PROGRAM.NAME_MAX_LENGTH),
  description: z.string().max(PROGRAM.DESCRIPTION_MAX_LENGTH).optional(),
  duration_days: z.number().int().min(PROGRAM.MIN_DURATION_DAYS).max(PROGRAM.MAX_DURATION_DAYS),
  milestones: z.array(createMilestoneSchema).optional(),
});

export const updateProgramSchema = z.object({
  name: z.string().min(PROGRAM.NAME_MIN_LENGTH).max(PROGRAM.NAME_MAX_LENGTH).optional(),
  description: z.string().max(PROGRAM.DESCRIPTION_MAX_LENGTH).optional(),
  duration_days: z
    .number()
    .int()
    .min(PROGRAM.MIN_DURATION_DAYS)
    .max(PROGRAM.MAX_DURATION_DAYS)
    .optional(),
  is_active: z.boolean().optional(),
});

export type CreateMilestoneSchema = z.infer<typeof createMilestoneSchema>;
export type CreateProgramSchema = z.infer<typeof createProgramSchema>;
export type UpdateProgramSchema = z.infer<typeof updateProgramSchema>;
