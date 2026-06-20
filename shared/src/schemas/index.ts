import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  confirmPassword: z.string(),
  firstName: z.string().min(1).max(100).regex(/^[a-zA-Z\s-]+$/, 'Only letters, spaces, and hyphens allowed'),
  lastName: z.string().min(1).max(100).regex(/^[a-zA-Z\s-]+$/, 'Only letters, spaces, and hyphens allowed'),
  department: z.string().min(1, 'Department is required'),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).regex(/^[a-zA-Z\s-]+$/).optional(),
  lastName: z.string().min(1).max(100).regex(/^[a-zA-Z\s-]+$/).optional(),
  department: z.string().min(1).optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
});

export const createTaskSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(['LEARNING', 'SETUP', 'MEETING', 'PROJECT', 'OTHER']),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).default('NOT_STARTED'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createIssueSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).default('OPEN'),
  resolutionNotes: z.string().max(5000).nullable().optional(),
}).refine(
  (data) => {
    if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
      return data.resolutionNotes && data.resolutionNotes.length > 0;
    }
    return true;
  },
  { message: 'Resolution notes are required when status is Resolved or Closed', path: ['resolutionNotes'] }
);

export const updateIssueSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  resolutionNotes: z.string().max(5000).nullable().optional(),
});

export const createFeedbackSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  subject: z.string().min(1, 'Subject is required').max(200),
  type: z.enum(['POSITIVE', 'SUGGESTION', 'CONCERN']),
  details: z.string().min(10, 'Details must be at least 10 characters').max(5000),
});

export const updateFeedbackSchema = createFeedbackSchema.partial();

export const createNoteSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  tags: z.array(z.string().min(1).max(50).regex(/^[a-zA-Z0-9-]+$/)).max(10).optional(),
});

export const updateNoteSchema = createNoteSchema.partial();

export const reportQuerySchema = z.object({
  type: z.enum(['tasks', 'issues', 'feedback', 'combined']),
  dateFrom: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  dateTo: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  format: z.enum(['pdf', 'csv']).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
