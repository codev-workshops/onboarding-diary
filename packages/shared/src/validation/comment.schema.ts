import { z } from 'zod';
import { COMMENT } from '../constants';

export const createCommentSchema = z.object({
  body: z
    .string()
    .min(COMMENT.BODY_MIN_LENGTH, 'Comment cannot be empty')
    .max(COMMENT.BODY_MAX_LENGTH),
});

export const updateCommentSchema = z.object({
  body: z
    .string()
    .min(COMMENT.BODY_MIN_LENGTH, 'Comment cannot be empty')
    .max(COMMENT.BODY_MAX_LENGTH),
});

export type CreateCommentSchema = z.infer<typeof createCommentSchema>;
export type UpdateCommentSchema = z.infer<typeof updateCommentSchema>;
