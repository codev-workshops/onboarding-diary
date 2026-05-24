import { z } from 'zod';
import { DIARY, PAGINATION } from '../constants';
import { Visibility } from '../enums';

export const createDiaryEntrySchema = z.object({
  title: z
    .string()
    .min(DIARY.TITLE_MIN_LENGTH, `Title must be at least ${DIARY.TITLE_MIN_LENGTH} characters`)
    .max(DIARY.TITLE_MAX_LENGTH),
  body: z
    .string()
    .min(DIARY.BODY_MIN_LENGTH, `Body must be at least ${DIARY.BODY_MIN_LENGTH} characters`)
    .max(DIARY.BODY_MAX_LENGTH),
  mood_rating: z.number().int().min(DIARY.MOOD_MIN).max(DIARY.MOOD_MAX),
  entry_date: z.string().date('Must be a valid date (YYYY-MM-DD)'),
  visibility: z.nativeEnum(Visibility),
  tags: z
    .array(
      z
        .string()
        .max(DIARY.TAG_MAX_LENGTH)
        .regex(/^[a-zA-Z0-9-]+$/, 'Tags must be alphanumeric with hyphens'),
    )
    .max(DIARY.MAX_TAGS)
    .optional(),
});

export const updateDiaryEntrySchema = z.object({
  title: z.string().min(DIARY.TITLE_MIN_LENGTH).max(DIARY.TITLE_MAX_LENGTH).optional(),
  body: z.string().min(DIARY.BODY_MIN_LENGTH).max(DIARY.BODY_MAX_LENGTH).optional(),
  mood_rating: z.number().int().min(DIARY.MOOD_MIN).max(DIARY.MOOD_MAX).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  tags: z
    .array(
      z
        .string()
        .max(DIARY.TAG_MAX_LENGTH)
        .regex(/^[a-zA-Z0-9-]+$/),
    )
    .max(DIARY.MAX_TAGS)
    .optional(),
});

export const diaryEntryListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sort_by: z.enum(['created_at', 'entry_date', 'mood_rating']).default('entry_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  mood_min: z.coerce.number().int().min(DIARY.MOOD_MIN).max(DIARY.MOOD_MAX).optional(),
  mood_max: z.coerce.number().int().min(DIARY.MOOD_MIN).max(DIARY.MOOD_MAX).optional(),
  tag: z.string().optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  q: z.string().max(200).optional(),
});

export type CreateDiaryEntrySchema = z.infer<typeof createDiaryEntrySchema>;
export type UpdateDiaryEntrySchema = z.infer<typeof updateDiaryEntrySchema>;
export type DiaryEntryListParamsSchema = z.infer<typeof diaryEntryListParamsSchema>;
