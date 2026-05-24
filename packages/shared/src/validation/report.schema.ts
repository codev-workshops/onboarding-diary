import { z } from 'zod';
import { PAGINATION, REPORT } from '../constants';
import { ExportFormat, ReportContentType, ReportStatus, ReportType } from '../enums';

export const createReportSchema = z
  .object({
    recruit_id: z.string().uuid('Recruit must be a valid user ID'),
    type: z.nativeEnum(ReportType).default(ReportType.CUSTOM),
    content_type: z.nativeEnum(ReportContentType).default(ReportContentType.COMBINED),
    title: z.string().min(REPORT.TITLE_MIN_LENGTH).max(REPORT.TITLE_MAX_LENGTH),
    summary: z.string().max(REPORT.SUMMARY_MAX_LENGTH).optional(),
    period_start: z.string().date('Must be a valid date (YYYY-MM-DD)'),
    period_end: z.string().date('Must be a valid date (YYYY-MM-DD)'),
  })
  .refine((data) => new Date(data.period_start) <= new Date(data.period_end), {
    message: 'period_start must be before or equal to period_end',
    path: ['period_end'],
  });

export const updateReportSchema = z.object({
  title: z.string().min(REPORT.TITLE_MIN_LENGTH).max(REPORT.TITLE_MAX_LENGTH).optional(),
  summary: z.string().max(REPORT.SUMMARY_MAX_LENGTH).optional(),
  status: z.nativeEnum(ReportStatus).optional(),
});

export const reportListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  sort_by: z.enum(['created_at', 'updated_at', 'period_start', 'type', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  type: z.nativeEnum(ReportType).optional(),
  status: z.nativeEnum(ReportStatus).optional(),
  recruit_id: z.string().uuid().optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
});

export const downloadReportParamsSchema = z.object({
  format: z.nativeEnum(ExportFormat),
});

export type CreateReportSchema = z.infer<typeof createReportSchema>;
export type UpdateReportSchema = z.infer<typeof updateReportSchema>;
export type ReportListParamsSchema = z.infer<typeof reportListParamsSchema>;
export type DownloadReportParamsSchema = z.infer<typeof downloadReportParamsSchema>;
