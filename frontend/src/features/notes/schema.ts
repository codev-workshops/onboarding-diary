import { z } from 'zod';

export const noteSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  content: z.string().max(5000, 'Content must be 5000 characters or fewer').optional(),
  tags: z
    .array(z.string().trim().min(1).max(30, 'Each tag must be 30 characters or fewer'))
    .max(10, 'A note can have at most 10 tags'),
});

export type NoteFormValues = z.infer<typeof noteSchema>;
